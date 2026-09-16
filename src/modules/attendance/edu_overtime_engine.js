const OT_TYPE = {
  WORKDAY: 'WORKDAY',
  WEEKEND: 'WEEKEND',
  HOLIDAY: 'HOLIDAY'
};

const MULTIPLIER = {
  WORKDAY: 1.5,
  WEEKEND: 2.0,
  HOLIDAY: 3.0
};

const EDU_POSITION_TAG = '教育岗';

function getAttributionMonth(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    throw new Error(`Invalid date format: ${dateStr}`);
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function isEduPosition(employee) {
  if (!employee) return false;
  const tag = employee.positionTag || employee.position_tag || '';
  return tag === EDU_POSITION_TAG;
}

function findValidExemption(employeeId, dateStr, exemptionList) {
  if (!Array.isArray(exemptionList) || exemptionList.length === 0) {
    return null;
  }
  const targetDate = new Date(dateStr);
  for (const ex of exemptionList) {
    if (ex.employeeId !== employeeId) continue;
    const effDate = new Date(ex.effectiveDate);
    const expDate = new Date(ex.expireDate);
    if (targetDate >= effDate && targetDate <= expDate) {
      return ex;
    }
  }
  return null;
}

function round2(num) {
  return Math.round(num * 100) / 100;
}

export function calcOvertimePay({
  employee,
  overtimeRecords,
  hourlyBase,
  exemptionList = [],
  payrollMonth
}) {
  if (!employee) {
    throw new Error('employee is required');
  }
  if (!Array.isArray(overtimeRecords)) {
    throw new Error('overtimeRecords must be an array');
  }
  if (typeof hourlyBase !== 'number' || hourlyBase <= 0) {
    throw new Error('hourlyBase must be a positive number');
  }

  const employeeId = employee.id || employee.employeeId || employee.emp_no;
  const isEdu = isEduPosition(employee);
  const targetMonth = payrollMonth || null;

  const eduOvertimeItems = [];
  let totalOvertimePay = 0;
  let exemptionValidCount = 0;
  let nonExemptCount = 0;

  for (const record of overtimeRecords) {
    const { date, hours, type } = record;
    if (hours <= 0) continue;

    const attributionMonth = getAttributionMonth(date);
    if (targetMonth && attributionMonth !== targetMonth) {
      continue;
    }

    let multiplier = 0;
    let otPay = 0;
    let reason = '';
    let isExempt = false;

    switch (type) {
      case OT_TYPE.WORKDAY: {
        if (hours < 2 && !isEdu) {
          multiplier = 0;
          otPay = 0;
          reason = '平日加班不足2小时，不计加班费';
          break;
        }
        multiplier = MULTIPLIER.WORKDAY;
        if (isEdu) {
          const validEx = findValidExemption(employeeId, date, exemptionList);
          if (validEx) {
            isExempt = true;
            multiplier = 0;
            otPay = 0;
            exemptionValidCount++;
            reason = '教育岗平日加班纳入月度课时津贴，OT豁免名单FR-3.6有效';
            break;
          } else {
            nonExemptCount++;
            reason = '教育岗平日加班，不在FR-3.6豁免名单，按标准1.5倍计发';
          }
        } else {
          nonExemptCount++;
          reason = '非教育岗平日加班≥2小时，按标准1.5倍计发';
        }
        otPay = round2(hours * multiplier * hourlyBase);
        break;
      }
      case OT_TYPE.WEEKEND: {
        multiplier = MULTIPLIER.WEEKEND;
        nonExemptCount++;
        if (isEdu) {
          reason = '教育岗周末加班，无论豁免与否按标准2倍计发';
        } else {
          reason = '非教育岗周末加班，按标准2倍计发';
        }
        otPay = round2(hours * multiplier * hourlyBase);
        break;
      }
      case OT_TYPE.HOLIDAY: {
        multiplier = MULTIPLIER.HOLIDAY;
        nonExemptCount++;
        if (isEdu) {
          reason = '教育岗节假日加班，无论豁免与否按标准3倍计发';
        } else {
          reason = '非教育岗节假日加班，按标准3倍计发';
        }
        otPay = round2(hours * multiplier * hourlyBase);
        break;
      }
      default:
        throw new Error(`Unknown overtime type: ${type}`);
    }

    totalOvertimePay = round2(totalOvertimePay + otPay);

    eduOvertimeItems.push({
      date,
      hours,
      type,
      multiplier,
      otPay,
      reason,
      isExempt,
      attributionMonth
    });
  }

  return {
    eduOvertimeItems,
    totalOvertimePay,
    exemptionValidCount,
    nonExemptCount
  };
}

export function crossValidateEduExemptions(exemptionList, fr36ApprovalMap) {
  if (!Array.isArray(exemptionList)) {
    throw new Error('exemptionList must be an array');
  }
  if (!fr36ApprovalMap || typeof fr36ApprovalMap !== 'object') {
    throw new Error('fr36ApprovalMap must be an object');
  }

  const unauthorizedExemptions = [];

  for (const ex of exemptionList) {
    const { employeeId, approvalNo, effectiveDate, expireDate } = ex;
    let issueType = null;
    let issueDetail = '';

    const approval = fr36ApprovalMap[approvalNo];
    if (!approval) {
      issueType = 'MISSING_APPROVAL';
      issueDetail = `审批单号${approvalNo}在FR-3.6审批名单中不存在`;
    } else {
      const approvalEff = new Date(approval.effectiveDate || effectiveDate);
      const approvalExp = new Date(approval.expireDate || expireDate);
      const exEff = new Date(effectiveDate);
      const exExp = new Date(expireDate);
      const approvalStatus = approval.status || 'active';

      if (approvalStatus !== 'active' && approvalStatus !== 'approved') {
        issueType = 'APPROVAL_INVALID';
        issueDetail = `审批单${approvalNo}状态为${approvalStatus}，非有效状态`;
      } else if (exEff < approvalEff || exExp > approvalExp) {
        issueType = 'DATE_OUT_OF_RANGE';
        issueDetail = `豁免有效期[${effectiveDate}, ${expireDate}]超出审批有效期[${approval.effectiveDate}, ${approval.expireDate}]`;
      } else if (approval.employeeId && approval.employeeId !== employeeId) {
        issueType = 'EMPLOYEE_MISMATCH';
        issueDetail = `审批单${approvalNo}归属员工${approval.employeeId}与豁免名单员工${employeeId}不一致`;
      }
    }

    if (issueType) {
      unauthorizedExemptions.push({
        employeeId,
        approvalNo,
        effectiveDate,
        expireDate,
        issueType,
        issueDetail
      });
    }
  }

  return unauthorizedExemptions;
}

export { OT_TYPE, MULTIPLIER, EDU_POSITION_TAG, getAttributionMonth, isEduPosition };

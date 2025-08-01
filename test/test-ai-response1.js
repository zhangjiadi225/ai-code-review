/* eslint-disable */
function getIdCardArea(idcard) { // 获取身份证区域
    var area = { 11: "北京", 12: "天津", 13: "河北", 14: "山西", 15: "内蒙古", 21: "辽宁", 22: "吉林", 23: "黑龙江", 31: "上海", 32: "江苏", 33: "浙江", 34: "安徽", 35: "福建", 36: "江西", 37: "山东", 41: "河南", 42: "湖北", 43: "湖南", 44: "广东", 45: "广西", 46: "海南", 50: "重庆", 51: "四川", 52: "贵州", 53: "云南", 54: "西藏", 61: "陕西", 62: "甘肃", 63: "青海", 64: "宁夏", 65: "新疆", 71: "台湾", 81: "香港", 82: "澳门" };
    var Y, JYM;
    var S, M;
    var idcard_array = new Array();
    idcard_array = idcard.split("");
    // 地区检验
    if (area[parseInt(idcard.substr(0, 2))] == null) {
      return false
    } else {
      return area[parseInt(idcard.substr(0, 2))]
    }
 }
 
 export function isIdCard(idcard) { // 身份证号是否有效
   if (typeof idcard !== 'string') {
     console.error('type error! idcard must be string')
     return false
   }
   var Errors = [ "ok",
                  "身份证号码位数不对!",
                  "身份证号码出生日期超出范围或含有非法字符!",
                  "身份证号码校验错误!",
                  "身份证地区非法!" ];
   var Y, JYM;
   var S, M;
   var idcard_array = new Array();
   idcard_array = idcard.split("");
   var reg = '';
   //地区检验
   if (getIdCardArea(idcard) == false) return Errors[4];
 
   //身份号码位数及格式检验
   switch (idcard.length) {
      case 18:
         //18位身份号码检测
         //出生日期的合法性检查
         //闰年月日:((01|03|05|07|08|10|12)(0[1-9]|[1-2][0-9]|3[0-1])|(04|06|09|11)(0[1-9]|[1-2][0-9]|30)|02(0[1-9]|[1-2][0-9]))
         //平年月日:((01|03|05|07|08|10|12)(0[1-9]|[1-2][0-9]|3[0-1])|(04|06|09|11)(0[1-9]|[1-2][0-9]|30)|02(0[1-9]|1[0-9]|2[0-8]))
         //加权因子
         var factor = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
         if(parseInt(idcard.substr(6, 4)) % 4 == 0 ||
             (parseInt(idcard.substr(6, 4)) % 100 == 0 &&
               parseInt(idcard.substr(6, 4)) % 4 == 0)) {
             reg = /^[1-9][0-9]{5}(19|20)[0-9]{2}((01|03|05|07|08|10|12)(0[1-9]|[1-2][0-9]|3[0-1])|(04|06|09|11)(0[1-9]|[1-2][0-9]|30)|02(0[1-9]|[1-2][0-9]))[0-9]{3}[0-9Xx]$/; //闰年出生日期的合法性正则表达式
         } else {
             reg = /^[1-9][0-9]{5}(19|20)[0-9]{2}((01|03|05|07|08|10|12)(0[1-9]|[1-2][0-9]|3[0-1])|(04|06|09|11)(0[1-9]|[1-2][0-9]|30)|02(0[1-9]|1[0-9]|2[0-8]))[0-9]{3}[0-9Xx]$/; //平年出生日期的合法性正则表达式
         }
         if(reg.test(idcard)) { //测试出生日期的合法性
              //计算校验位
              S = 0
              for (let i = 0; i < 17; i++) {
                S += parseInt(idcard_array[i]) * parseInt(factor[i])
              }
              Y = S % 11;
              M = "F";
              JYM = "10X98765432";
              M = JYM.substr(Y, 1); //判断校验位
              if (M == idcard_array[17]) {
                return Errors[0]; //检测ID的校验位
              }
              else return Errors[3];
         }
         else return Errors[2];
         break;
      default:
         return Errors[1]; break;
    }
    return true;
 }
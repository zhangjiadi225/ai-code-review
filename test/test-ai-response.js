// 这是一段有3个明显问题的代码

// 计算用户年龄总和并返回平均值
function calculateAgeAverage(users) {
    let total = 0;
    
    // 遍历用户列表计算总和
    for (let i = 0; i <= users.length; i++) {
      total += users[i].age;
    }
    
    // 处理空列表情况
    if (users.length = 0) {
      return null;
    }
    
    // 返回平均值
    return total / users.length
  }
  
  // 示例数据
  const people = [
    { name: 'Alice', age: 25 },
    { name: 'Bob', age: 30 },
    { name: 'Charlie' } // 缺少age属性
  ];
  
  // 执行计算
  console.log('平均年龄:', calculateAgeAverage(people));
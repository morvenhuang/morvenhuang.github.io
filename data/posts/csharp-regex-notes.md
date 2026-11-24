有一段时间，正则表达式在 CSDN 上很热门，一天能看到好几个相关帖子。我借助论坛和 Wrox Press 出版的《C# 字符串和正则表达式参考手册》学了些基础，也在 CSDN 攒了大约 1000 分。后来用正则表达式少了，那本手册也找不到了。趁还记得，整理一下当时的笔记。

## 1. `@` 与逐字字符串

`@` 是 C# 的字符串语法，写在字符串字面量前，表示这是一个逐字字符串。下面两个声明等效。

```csharp
string x="D:\\My Huang\\My Doc";
string y = @"D:\My Huang\My Doc";
```

如果写成下面这样，C# 会报错。普通字符串中的反斜杠用于转义，例如 `\n` 表示换行。

```csharp
string x = "D:\My Huang\My Doc";
```

## 2. 基本字符类

| 写法 | 含义 |
| --- | --- |
| `\d` | Unicode 十进制数字，包括 `0` 到 `9` |
| `\D` | 非十进制数字字符 |
| `\w` | 单词字符，包括 Unicode 字母、十进制数字、非间距标记和下划线等连接标点 |
| `\W` | 非单词字符 |
| `\s` | 空白字符，如换行 `\n`、回车 `\r`、制表 `\t`、垂直制表 `\v` 和换页 `\f` |
| `\S` | 非空白字符 |
| `.` | 默认匹配除 `\n` 之外的任意单个字符 |
| `[…]` | 匹配字符组中的任意一个字符 |
| `[^…]` | 匹配字符组之外的任意一个字符 |

```csharp
string i = "\n";
string m = "3";
Regex r = new Regex(@"\D");
//同Regex r = new Regex("\\D");
//r.IsMatch(i)结果：true
//r.IsMatch(m)结果：false

string i = "%";
string m = "3";
Regex r = new Regex("[a-z0-9]");
//匹配小写字母或数字字符
//r.IsMatch(i)结果：false
//r.IsMatch(m)结果：true
```

## 3. 定位字符

定位字符匹配的是位置。可以把它理解为两个字符之间的间隙，或字符串的起止位置。

| 写法 | 含义 |
| --- | --- |
| `^` | 默认匹配字符串开头，多行模式下也匹配各行开头 |
| `$` | 默认匹配字符串末尾或末尾换行符之前，多行模式下也匹配各行末尾 |
| `\b` | 单词边界 |
| `\B` | 非单词边界 |
| `\A` | 字符串开头 |
| `\z` | 字符串的绝对末尾 |
| `\Z` | 字符串末尾，或末尾换行符之前 |

```csharp
string i = "Live for nothing,die for something";
Regex r1 = new Regex("^Live for nothing,die for something$");
//r1.IsMatch(i) true
Regex r2 = new Regex("^Live for nothing,die for some$");
//r2.IsMatch(i) false
Regex r3 = new Regex("^Live for nothing,die for some");
//r3.IsMatch(i) true

string i = @"Live for nothing,
die for something";//多行
Regex r1 = new Regex("^Live for nothing,die for something$");
Console.WriteLine("r1 match count:" + r1.Matches(i).Count);//0
Regex r2 = new Regex("^Live for nothing,die for something$", RegexOptions.Multiline);
Console.WriteLine("r2 match count:" + r2.Matches(i).Count);//0
Regex r3 = new Regex("^Live for nothing,\r\ndie for something$");
Console.WriteLine("r3 match count:" + r3.Matches(i).Count);//1
Regex r4 = new Regex("^Live for nothing,$");
Console.WriteLine("r4 match count:" + r4.Matches(i).Count);//0
Regex r5 = new Regex("^Live for nothing,$", RegexOptions.Multiline);
Console.WriteLine("r5 match count:" + r5.Matches(i).Count);//0
Regex r6 = new Regex("^Live for nothing,\r\n$");
Console.WriteLine("r6 match count:" + r6.Matches(i).Count);//0
Regex r7 = new Regex("^Live for nothing,\r\n$", RegexOptions.Multiline);
Console.WriteLine("r7 match count:" + r7.Matches(i).Count);//0
Regex r8 = new Regex("^Live for nothing,\r$");
Console.WriteLine("r8 match count:" + r8.Matches(i).Count);//0
Regex r9 = new Regex("^Live for nothing,\r$", RegexOptions.Multiline);
Console.WriteLine("r9 match count:" + r9.Matches(i).Count);//1
Regex r10 = new Regex("^die for something$");
Console.WriteLine("r10 match count:" + r10.Matches(i).Count);//0
Regex r11 = new Regex("^die for something$", RegexOptions.Multiline);
Console.WriteLine("r11 match count:" + r11.Matches(i).Count);//1
Regex r12 = new Regex("^");
Console.WriteLine("r12 match count:" + r12.Matches(i).Count);//1
Regex r13 = new Regex("$");
Console.WriteLine("r13 match count:" + r13.Matches(i).Count);//1
Regex r14 = new Regex("^", RegexOptions.Multiline);
Console.WriteLine("r14 match count:" + r14.Matches(i).Count);//2
Regex r15 = new Regex("$", RegexOptions.Multiline);
Console.WriteLine("r15 match count:" + r15.Matches(i).Count);//2
Regex r16 = new Regex("^Live for nothing,\r$\n^die for something$", RegexOptions.Multiline);
Console.WriteLine("r16 match count:" + r16.Matches(i).Count);//1
//对于一个多行字符串，在设置了Multiline选项之后，^和$将出现多次匹配。

string i = "Live for nothing,die for something";
string m = "Live for nothing,die for some thing";
Regex r1 = new Regex(@"\bthing\b");
Console.WriteLine("r1 match count:" + r1.Matches(i).Count);//0
Regex r2 = new Regex(@"thing\b");
Console.WriteLine("r2 match count:" + r2.Matches(i).Count);//2
Regex r3 = new Regex(@"\bthing\b");
Console.WriteLine("r3 match count:" + r3.Matches(m).Count);//1
Regex r4 = new Regex(@"\bfor something\b");
Console.WriteLine("r4 match count:" + r4.Matches(i).Count);//1
//\b通常用于约束一个完整的单词
```

## 4. 量词

量词描述前一个字符或组可以重复多少次。

| 写法 | 重复次数 |
| --- | --- |
| `{n}` | 正好 `n` 次 |
| `{n,}` | 至少 `n` 次 |
| `{n,m}` | `n` 到 `m` 次 |
| `?` | 0 次或 1 次 |
| `+` | 1 次或多次 |
| `*` | 0 次或多次 |

```csharp
string x = "1024";
string y = "+1024";
string z = "1,024";
string a = "1";
string b="-1024";
string c = "10000";
Regex r = new Regex(@"^\+?[1-9],?\d{3}$");
Console.WriteLine("x match count:" + r.Matches(x).Count);//1
Console.WriteLine("y match count:" + r.Matches(y).Count);//1
Console.WriteLine("z match count:" + r.Matches(z).Count);//1
Console.WriteLine("a match count:" + r.Matches(a).Count);//0
Console.WriteLine("b match count:" + r.Matches(b).Count);//0
Console.WriteLine("c match count:" + r.Matches(c).Count);//0
//匹配1000到9999的整数。
```

## 5. 择一匹配

字符组 `[a-z]` 匹配其中的任意单个字符。用 `|` 可以在多个模式之间择一匹配，例如 `(ab|xy)` 匹配 `ab` 或 `xy`，括号将两个分支放在同一组中。

```csharp
string x = "0";
string y = "0.23";
string z = "100";
string a = "100.01";
string b = "9.9";
string c = "99.9";
string d = "99.";
string e = "00.1";
Regex r = new Regex(@"^\+?((100(.0+)*)|([1-9]?[0-9])(\.\d+)*)$");
Console.WriteLine("x match count:" + r.Matches(x).Count);//1
Console.WriteLine("y match count:" + r.Matches(y).Count);//1
Console.WriteLine("z match count:" + r.Matches(z).Count);//1
Console.WriteLine("a match count:" + r.Matches(a).Count);//0
Console.WriteLine("b match count:" + r.Matches(b).Count);//1
Console.WriteLine("c match count:" + r.Matches(c).Count);//1
Console.WriteLine("d match count:" + r.Matches(d).Count);//0
Console.WriteLine("e match count:" + r.Matches(e).Count);//0
//匹配0到100的数。最外层的括号内包含两部分“(100(.0+)*)”，“([1-9]?[0-9])(\.\d+)*”，这两部分是“OR”的关系，即正则表达式引擎会先尝试匹配100，如果失败，则尝试匹配后一个表达式（表示[0,100)范围中的数字）。
```

## 6. 匹配特殊字符

下面的示例演示怎样匹配反斜杠等特殊字符。把正则写进 C# 字符串时，字符串字面量和正则表达式各有一层转义规则。

```csharp
string x = "\\";
Regex r1 = new Regex("^\\\\$");
Console.WriteLine("r1 match count:" + r1.Matches(x).Count);//1
Regex r2 = new Regex(@"^\\$");
Console.WriteLine("r2 match count:" + r2.Matches(x).Count);//1
Regex r3 = new Regex("^\\$");
Console.WriteLine("r3 match count:" + r3.Matches(x).Count);//0
//匹配“\”

string x = "\"";
Regex r1 = new Regex("^\"$");
Console.WriteLine("r1 match count:" + r1.Matches(x).Count);//1
Regex r2 = new Regex(@"^""$");
Console.WriteLine("r2 match count:" + r2.Matches(x).Count);//1
//匹配双引号
```

## 7. 捕获组与非捕获组

普通括号 `(...)` 会捕获组中匹配到的文本，`(?:...)` 只用于分组。

```csharp
string x = "Live for nothing,die for something";
string y = "Live for nothing,die for somebody";
Regex r = new Regex(@"^Live ([a-z]{3}) no([a-z]{5}),die \1 some\2$");
Console.WriteLine("x match count:" + r.Matches(x).Count);//1
Console.WriteLine("y match count:" + r.Matches(y).Count);//0
//正则表达式引擎会记忆“()”中匹配到的内容，作为一个“组”，并且可以通过索引的方式进行引用。表达式中的“\1”，用于反向引用表达式中出现的第一个组，即粗体标识的第一个括号内容，“\2”则依此类推。

string x = "Live for nothing,die for something";
Regex r = new Regex(@"^Live for no([a-z]{5}),die for some\1$");
if (r.IsMatch(x))
{
    Console.WriteLine("group1 value:" + r.Match(x).Groups[1].Value);//输出：thing
}
//获取组中的内容。注意，此处是Groups[1]，因为Groups[0]是整个匹配的字符串，即整个变量x的内容。

string x = "Live for nothing,die for something";
Regex r = new Regex(@"^Live for no(?<g1>[a-z]{5}),die for some\1$");
if (r.IsMatch(x))
{
    Console.WriteLine("group1 value:" + r.Match(x).Groups["g1"].Value);//输出：thing
}
//可根据组名进行索引。使用以下格式为标识一个组的名称(?<groupname>…)。

string x = "Live for nothing nothing";
Regex r = new Regex(@"([a-z]+) \1");
if (r.IsMatch(x))
{
    x = r.Replace(x, "$1");
    Console.WriteLine("var x:" + x);//输出：Live for nothing
}
//删除原字符串中重复出现的“nothing”。在表达式之外，使用“$1”来引用第一个组，下面则是通过组名来引用：
string x = "Live for nothing nothing";
Regex r = new Regex(@"(?<g1>[a-z]+) \1");
if (r.IsMatch(x))
{
    x = r.Replace(x, "${g1}");
    Console.WriteLine("var x:" + x);//输出：Live for nothing
}

string x = "Live for nothing";
Regex r = new Regex(@"^Live for no(?:[a-z]{5})$");
if (r.IsMatch(x))
{
    Console.WriteLine("group1 value:" + r.Match(x).Groups[1].Value);//输出：(空)
}
//在组前加上“?:”表示这是个“非捕获组”，即引擎将不保存该组的内容。
```

## 8. 贪婪与非贪婪

贪婪量词会在模式允许的范围内尽量多匹配。给 `*` 或 `+` 等量词加上 `?`，就会优先尝试匹配尽可能少的字符。

```csharp
string x = "Live for nothing,die for something";
Regex r1 = new Regex(@".*thing");
if (r1.IsMatch(x))
{
    Console.WriteLine("match:" + r1.Match(x).Value);//输出：Live for nothing,die for something
}
Regex r2 = new Regex(@".*?thing");
if (r2.IsMatch(x))
{
    Console.WriteLine("match:" + r2.Match(x).Value);//输出：Live for nothing
}
```

## 9. 回溯与原子组

贪婪匹配有时需要回退，才能让后面的模式也匹配成功。`(?>...)` 是原子组。一旦组内匹配成功，引擎就不会再回到组内调整此前的选择。

```csharp
string x = "Live for nothing,die for something";
Regex r1 = new Regex(@".*thing,");
if (r1.IsMatch(x))
{
    Console.WriteLine("match:" + r1.Match(x).Value);//输出：Live for nothing,
}
Regex r2 = new Regex(@"(?>.*)thing,");
if (r2.IsMatch(x))//不匹配
{
    Console.WriteLine("match:" + r2.Match(x).Value);
}
//在r1中，“.*”由于其贪婪特性，将一直匹配到字符串的最后，随后匹配“thing”，但在匹配“,”时失败，此时引擎将回溯，并在“thing,”处匹配成功。
在r2中，由于强制非回溯，所以整个表达式匹配失败。
```

## 10. 向前和向后查找

正向先行断言 `(?=...)` 和负向先行断言 `(?!...)` 检查当前位置之后的内容。断言本身不会消耗字符。

```csharp
string x = "1024 used 2048 free";
Regex r1 = new Regex(@"\d{4}(?= used)");
if (r1.Matches(x).Count==1)
{
    Console.WriteLine("r1 match:" + r1.Match(x).Value);//输出：1024
}
Regex r2 = new Regex(@"\d{4}(?! used)");
if (r2.Matches(x).Count==1)
{
    Console.WriteLine("r2 match:" + r2.Match(x).Value); //输出：2048
}
//r1中的正声明表示必须保证在四位数字的后面必须紧跟着“ used”，r2中的负声明表示四位数字之后不能跟有“ used”。
```

正向后行断言 `(?<=...)` 和负向后行断言 `(?<!...)` 则检查当前位置之前的内容。

```csharp
string x = "used:1024 free:2048";
Regex r1 = new Regex(@"(?<=used:)\d{4}");
if (r1.Matches(x).Count==1)
{
    Console.WriteLine("r1 match:" + r1.Match(x).Value);//输出：1024
}
Regex r2 = new Regex(@"(?<!used:)\d{4}");
if (r2.Matches(x).Count==1)
{
    Console.WriteLine("r2 match:" + r2.Match(x).Value);//输出：2048
}
//r1中的反向正声明表示在4位数字之前必须紧跟着“used:”，r2中的反向负声明表示在4位数字之前必须紧跟着除“used:”之外的字符串。
```

## 11. 十六进制字符

`\xXX` 使用两位十六进制数指定字符，例如 `\x20` 表示空格。`\uXXXX` 使用四位十六进制数，例如 `[\u4e00-\u9fa5]` 匹配该区间内的一个字符。

## 12. 匹配 0 到 100 的数值

这个综合示例匹配区间 `[0, 100]`，需要考虑以下边界情况。

- `00`、`00.`、`00.00` 和 `001.100` 合法。
- 空字符串、单独的小数点以及大于 100 的值不合法。
- `1.07f` 这类带类型后缀的写法未纳入。

```csharp
Regex r = new Regex(@"^\+?0*(?:100(\.0*)?|(\d{0,2}(?=\.\d)|\d{1,2}(?=($|\.$)))(\.\d*)?)$");
string x = "";
while (true)
{
    x = Console.ReadLine();
    if (x != "exit")
    {
        if (r.IsMatch(x))
        {
            Console.WriteLine(x + " succeed!");
        }
        else
        {
            Console.WriteLine(x + " failed!");
        }
    }
    else
    {
        break;
    }
}
```

## 13. 精确匹配的取舍

日期、URL、电子邮件地址等格式很难用一条简短的表达式精确覆盖。需要严格校验时，可能要先查阅相应规范。日常应用也可以根据需求缩小日期范围，或者只覆盖最常见的电子邮件地址形式。

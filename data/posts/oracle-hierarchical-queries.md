## 准备测试数据

闲话少说，直入正题。建立一张简单的职工表 t_hierarchical:

- Emp 职工编号

- Mgr  职工的直接上司（Mgr本身也是职工）

- Emp_name 职工姓名

插入一些测试数据，除了大老板AA，其它的职工都各有自己的Manager。

```sql
select emp, mgr, emp_name from t_hierarchical t;
```

```text
1            AA
2     1     BB
3     2     CC
4     3     DD
5     2     EE
6     3     FF
```

## CONNECT BY

```sql
select emp, mgr, LEVEL from t_hierarchical t
CONNECT BY PRIOR emp=mgr
order by emp;
```

```text
1            1
2     1     2
2     1     1
3     2     1
3     2     3
3     2     2
4     3     4
4     3     1
4     3     2
4     3     3
5     2     3
5     2     2
5     2     1
6     3     2
6     3     3
6     3     4
6     3     1
```

解释一下，CONNECT BY用于指定 父-子 记录的关系（PRIOR我们在下例中解释，更直观一些）。举emp 2为例，他隶属于emp 1，如果我们以emp 1为根节点，显然LEVEL=2；以emp 2自身为根节点，则LEVEL=1，这就是为什么上述查询结果中出现了两行对应记录，其它的类推。

## START WITH

通常我们需要更直观、更具有实用性的结果，这需要用到结构化查询中的START WITH子句，用于指定根节点：

```sql
select emp, mgr, LEVEL from t_hierarchical t
START WITH emp=1
CONNECT BY PRIOR emp=mgr;
```

```text
1            1
2     1     2
3     2     3
4     3     4
6     3     4
5     2     3
```

这里我们指定了根节点是emp 1，这样的结果直观了许多，例如，以emp 1为根节点，那么emp 3位于第三级（emp 1—emp 2—emp 3），这里补充一下 PRIOR 关键字的说明，“PRIOR emp=mgr”表示父记录的emp编号 = 当前记录的mgr编号，从查询结果中可以看出这一点。同时，从查询结果中还能发现明显的 递归 痕迹，可对照 LEVEL 和各行的父子关系。

## SYS_CONNECT_BY_PATH()

这里介绍一下SYS_CONNECT_BY_PATH()函数，我们可以得到层次结构或者说树状结构的 路径， 参见如下：

```sql
select emp, mgr, LEVEL, SYS_CONNECT_BY_PATH(emp,'/') path from t_hierarchical t
START WITH emp=1
CONNECT BY PRIOR emp=mgr;
```

```text
1            1     /1
2     1     2     /1/2
3     2     3     /1/2/3
4     3     4     /1/2/3/4
6     3     4     /1/2/3/6
5     2     3     /1/2/5
```

## CONNECT_BY_ISLEAF

非常好用的CONNECT_BY_ISLEAF虚列。何谓LEAF（叶子），即没有任何节点隶属于该节点：

```sql
select emp, mgr, LEVEL, SYS_CONNECT_BY_PATH(emp,'/') path from t_hierarchical t
where CONNECT_BY_ISLEAF=1
START WITH emp=1
CONNECT BY PRIOR emp=mgr;
```

```text
4     3     4     /1/2/3/4
6     3     4     /1/2/3/6
5     2     3     /1/2/5
```

## CONNECT BY与WHERE子句

下面再说说，关于引入结构化查询后，SQL语句的执行顺序问题，根据Oracle文档，先后是：

1）JOIN，无论用的是JOIN ON的写法，还是在WHERE中做的关联

2）CONNECT BY

3）其它的WHERE条件

看一个例子，假设上面的各位职工，需要保存一些注释信息，同时这些信息根据中文、英文分成两个不同版本，我们可以简单设计一下这个注释表：

- Emp 职工编号

- Lang 语言（中文或英文）

- Emp_desc 职工的具体描述

```sql
select emp, lang, emp_desc from t_desc;
```

```text
1     chinese 这是注释
1     english   this is comment
2     chinese 这是注释
2     english   this is comment
3     chinese 这是注释
3     english   this is comment
4     chinese 这是注释
4     english   this is comment
5     chinese 这是注释
5     english   this is comment
6     chinese 这是注释
6     english   this is comment
```

现在需要在原有的职工结构化查询中包括每个职工的中文注释信息，我们看看下面的查询：

```sql
select t.emp, t.mgr, td.emp_desc, LEVEL
from t_hierarchical t, t_desc td
where t.emp=td.emp and td.lang='chinese'
START WITH t.emp=1
CONNECT BY PRIOR t.emp=t.mgr;
```

```text
1            chinese 这是注释 1
2     1     chinese 这是注释 2
3     2     chinese 这是注释 3
4     3     chinese 这是注释 4
6     3     chinese 这是注释 4
4     3     chinese 这是注释 4
6     3     chinese 这是注释 4
5     2     chinese 这是注释 3
3     2     chinese 这是注释 3
4     3     chinese 这是注释 4
6     3     chinese 这是注释 4
4     3     chinese 这是注释 4
6     3     chinese 这是注释 4
5     2     chinese 这是注释 3
2     1     chinese 这是注释 2
3     2     chinese 这是注释 3
4     3     chinese 这是注释 4
6     3     chinese 这是注释 4
4     3     chinese 这是注释 4
6     3     chinese 这是注释 4
5     2     chinese 这是注释 3
3     2     chinese 这是注释 3
4     3     chinese 这是注释 4
6     3     chinese 这是注释 4
4     3     chinese 这是注释 4
6     3     chinese 这是注释 4
5     2     chinese 这是注释 3
```

再看这个查询，看起来与前者是一样的：

```sql
select t.emp, t.mgr, td.emp_desc, LEVEL
from t_hierarchical t join t_desc td
on (t.emp=td.emp and td.lang='chinese')
START WITH t.emp=1
CONNECT BY PRIOR t.emp=t.mgr;
```

```text
1            这是注释 1
2     1     这是注释 2
3     2     这是注释 3
4     3     这是注释 4
6     3     这是注释 4
5     2     这是注释 3
```

第二个是我们期望的结果，第一个则出现了大量重复行。追究原因，是因为前一个例子中第二个条件 td.lang=’chinese’不被认为是JOIN条件，所以在CONNECT BY之后执行；后一个例子中由于显式地把第二个条件写在了JOIN ON子句中，所以它在CONNECT BY之前执行。

由于缺少第二个条件的JOIN（即本节第一例）会导致每个的职工出现两次，换一个数据少一点的例子，看看CONNECT BY遇到这样的重复数据的时候是怎么处理的。

```sql
select emp, mgr, lang from t2;
```

```text
1            chinese
1            english
2     1     chinese
2     1     english
```

CONNECT BY之后：

```sql
select emp, mgr, lang from t2
start with emp=1
connect by prior emp=mgr;
```

```text
1            chinese
2     1     chinese
2     1     english
1            english
2     1     chinese
2     1     english
```

lang=’chinese’过滤之后：

```text
1            chinese
2     1     chinese
2     1     chinese
```

出现重复行，显然不是我们期望的结果。

## CONNECT BY LEVEL

下面我再来看看一个特殊的用法 CONNECT BY LEVEL，这是一个理解起来令人头痛，但同时在某些情境下又是非常有用的：

```sql
select LEVEL from dual CONNECT BY LEVEL<=6;
```

```text
1
2
3
4
5
6
```

如果你以前从未使用过，但是不幸你猜中了结果，我深表佩服，我至今没有想通，事实上，它甚至不太符合结构化查询CONNECT BY的语法，因为根据Oracle文档，CONNECT BY条件中至少有一个表达式要使用PRIOR关键字。 以至于有人觉得CONNECT BY LEVEL是一个BUG，怀疑Oracle可能在后续的版本中加以纠正。

无论如何，CONNECT BY LEVEL在Oracle 10g/11g中运行良好，如果你不想费劲想通这其中的原由，可以简单地把它认为是构造了一个循环，因此如果你写成CONNECT BY 1=1，则会输出1到无穷大的数。

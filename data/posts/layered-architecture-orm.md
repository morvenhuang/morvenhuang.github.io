软件分层可以让结构更清晰，也有利于代码重用。它有点像社会分工，有了分工，人们就可以各司其职，写 .NET 程序时也不用同时种庄稼了。

分层结构比较容易理解。下面介绍一个简单的例子，适用于进销存系统这类主要和数据库打交道的项目。这套结构当时已经在项目中使用。

## 1. 数据访问层

数据访问层包含两部分。

1. 用工厂模式实现通用的数据访问功能，可以使用 `IDbConnection`、`IDbCommand` 和 `IDbTransaction` 等接口。这里略去具体实现。
2. 通过反射，在实体对象、SQL 语句和查询结果之间进行转换。

第二部分包含以下方法。

- `BuildCreateObjSql` 生成 `INSERT` 语句。
- `BuildUpdateObjSql` 生成 `UPDATE` 语句。
- `BuildSelectObjSql` 生成 `SELECT` 语句。
- `BuildObj` 根据 `IDataReader` 创建实体对象并为其成员赋值。
- `BuildObjs` 根据 `DataTable` 生成实体对象数组。

这个例子约定实体类名与数据库表名一致，实体属性名与表字段名一致。下面是部分实现。

```csharp
public static string BuildCreateObjSql(object pObj)
{
    …………
    Type t= pObj.GetType();
    PropertyInfo[] pis=t.GetProperties();
    for(int i=0;i<pis.Length;i++)
    {
        switch(pis[i].PropertyType.ToString())
        {
            case"System.Int32":
                fieldString+=pis[i].Name;
                valueString+=pis[i].GetValue(pObj,null).ToString();
                break;
            case"System.String":
                …………
        }
        if(i<pis.Length-1)
        {
            fieldString+=",";
            valueString+=",";
        }
    }
    result="insert into "+t.Name+"("+fieldString+") values("+valueString+")"+";";
    return result;
}


public static object BuildObj(string pClassName,IDataReader pReader)
{
    Type t=Type.GetType(namespace+ pClassName);
    PropertyInfo[] pis=t.GetProperties();
    object obj=Activator.CreateInstance(t);
    BindValue (obj,pis,pReader); //为各字段赋值
    return obj;
}


private static void BindValue (object pObj,PropertyInfo[] pPis,IDataReader pReader)
{
    for(int i=0;i<pPis.Length;i++)
    {
        for(int j=0;j<pReader.FieldCount;j++)
        {
            switch(pPis[i].PropertyType.ToString())
            {
                case"System.Int32":
                    pPis[i].SetValue(pObj,int.Parse(pReader[pPis[i].Name].ToString()),null);
                    break;
                case"System.String":
                    …………;
                    break;
            }
        }
    }
}
```

## 2. 实体层

实体层包含所有实体类。假设数据库有一张 `Book` 表，包含 `id`、`bookname`、`price` 和 `authorid` 字段，对应的实体类可以这样写。

```csharp
public class Book : EntityHome
{
    private string m_BookName;
    private decimal m_Price;
    private int m_AuthorID;

    public Book()
    {
    }
    
    public Book(int ID,string BookName, decimal Price, int AuthorID)
    {
        this.ID=ID;
        this.BookName=BookName;
        this.Price=Price;
        this.AuthorID=AuthorID;
    }

    public string BookName
    {
        get
        {
            return this.m_BookName;
        }
        set
        {
            this.m_BookName=value;
        }
    }

    public decimal Price
    {
        …………
    }

    public int AuthorID
    {
        …………
    }
}
```

数据库表较多时，逐个编写实体类比较枯燥。这部分工作也可以交给根据数据库表生成实体类文件的工具。

## 3. 业务层

业务层的控制类与实体类一一对应。`SingleHomeCtr` 是处理单个实体的控制类基类，`MultiHomeCtr` 用于处理多个实体。下面以 `BookCtr` 为例。

```csharp
public class BookCtr:SingleHomeCtr
{
    public BookCtr()
    {
    }

    public void CreateObj(Book obj)
    {
        //通过数据访问层中的反射方法，生成sql语句，并最终持久化成数据库表中的一条记录。
        …………
    }

    public Book RetrieveObj(int id)
    {
        //通过数据访问层中的方法，生成sql语句，并最终返回一个Book对象。
        …………
    }

    public void UpdateObj(Book obj)
    {
        //通过数据访问层中的反射方法，生成sql语句，并最终持久化成数据库表中的一条记录。
        …………
    }
}
```

## 4. UI 层

有了以上几层，界面就可以通过对象来操作数据库。例如，可以根据表中的一条记录创建一个 `Book` 对象。

```csharp
Book b = null;
BookCtr bctr = new BookCtr();
b = bctr.RetrieveObj(id);
```

调用对象的 `CreateObj` 方法可以把新数据保存到数据库，调用 `UpdateObj` 方法可以更新已有记录。

## 5. OR 映射

OR 映射主要解决对象与关系数据之间的对应，以及对象的持久化问题。简单来说，就是把对数据库的操作转化为对对象的操作。

完整的 OR 映射涉及很多细节。上面的例子适用于简单映射。如果一个对象需要关联多个数据库表，也就是原文所说的「粗粒度对象」，实现就会复杂得多。

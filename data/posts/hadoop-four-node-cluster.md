本文记录了 CentOS 6.5 64 位系统上 Hadoop 1.2.1 的四节点集群配置，命令与配置沿用 2014 年的实验环境。

## 环境

操作系统：CentOS 6.5 64bit

Hadoop：Version 1.2.1

Servers：hadoopnamenode，hadoop2ndnamenode，hadoopdatanode1，hadoopdatanode2

注：为方便起见，在这4台server上，我都直接使用root账户进行操作

## 下载及环境变量设置

在所有4台server上：

从Apache网站下载hadoop-1.2.1-bin.tar.gz，解压后放置在某个目录下，我放在了/usr/local下，为方便起见，我把目录hadoop-1.2.1改名为hadoop。

修改.bashrc，添加下面的环境变量：

```text
export HADOOP_PREFIX=/usr/local/hadoop
export PATH=$PATH:$HADOOP_PREFIX/bin
```

## 配置hosts文件

在/etc/hosts中添加：

```text
153.65.170.11  hadoopnamenode
153.65.170.45  hadoop2ndnamenode
153.65.171.174  hadoopdatanode1
153.65.171.24  hadoopdatanode2
```

## 配置ssh

在hadoopnamenode上执行：

```text
ssh-keygen//生成公钥、私钥
ssh-copy-id   –i   ~/.ssh/id_rsa.pub   root@hadoop2ndnamenode//将hadoopnamenode的公钥copy到其它三台server上
ssh-copy-id   –i   ~/.ssh/id_rsa.pub   root@hadoopdatanode1
ssh-copy-id   –i   ~/.ssh/id_rsa.pub   root@hadoopdatanode2
```

这么做的目的是可以不需要密码从hadoopnamenode上ssh到其它三台server上。经过ssh-copy-id后，这个公钥实际上会被添加到其它三台server的~/.ssh/authorized_keys文件中。

例如从 hadoopnamenode 登录 hadoop2ndnamenode 时，后者使用预先保存的公钥验证客户端的签名，以完成公钥认证。

## 配置Hadoop

一般地，我们将使用下面的命令启动hdfs（即name node, secondary name node, data node）及MapReduce：

```text
/usr/local/hadoop/bin/start-dfs.sh
/usr/local/hadoop/bin/start-mapred.sh
```

start-dfs.sh的流程大概是这样：

执行该命令的机器自动成为name node(以及job tracker)，

启动/usr/local/hadoop/conf/slaves中列出的所有机器并作为data node(以及task tracker)，

启动/usr/local/hadoop/conf/masters中列出的所有机器并作为secondary name node。

start-mapred.sh的流程类似：

执行该命令的机器自动成为job tracker，

启动/usr/local/hadoop/conf/slaves中列出的所有机器并作为task tracker

注：conf/masters文件往往给人带来困惑，直观上让人觉得它是为配置name node所用，但是因为(1)的原因，name node是不需要特别配置到conf/masters中，需要配置的只有secondary name node。

根据以上描述，我们可以开始修改hadoopnamenode上的masters文件，删除原内容，添加一行：

```text
hadoop2ndnamenode
```

修改hadoopnamenode上的slaves文件，删除原内容，添加两行：

```text
hadoopdatanode1
hadoopdatanode2
```

除此之外，需要在hadoopdatanode1与hadoopdatanode2上作出配置，使得data node知道name node，task tracker知道job tracker。所以分别修改hadoopdatanode1与hadoopdatanode2上的conf/core-site.xml：

```xml
<configuration>
  <property>
    <name>fs.default.name</name>
    <value>hdfs://hadoopnamenode:10001</value>
  </property>
</configuration>
```

及conf/mapred-site.xml：

```xml
<configuration>
  <property>
    <name>mapred.job.tracker</name>
    <value>hadoopnamenode:10002</value>
  </property>
</configuration>
```

## 格式化name node

在hadoopnamenode上执行：

```text
hadoop  namenode  -format
```

## 启动Hadoop

首先，在hadoopnamenode上执行下面命令来启动所有name node, secondary name node, data node：

```text
start-dfs.sh
```

可以使用jps命令在4台server上查看当前运行的java进程，正常情况你会看到：

```text
hadoopnamenode上有进程：NameNode
hadoop2ndnamenode上有进程：SecondaryNameNode
hadoopdatanode1/hadoopdatanode2上有进程：DataNode
```

其次，在hadoopnamenode上执行下面命令来启动所有job tracker, task tracker：

```text
start-mapred.sh
```

继续使用jps命令在4台server上查看当前运行的java进程，正常情况你会看到：

```text
hadoopnamenode上有进程：NameNode, JobTracker
hadoop2ndnamenode上有进程：SecondaryNameNode
hadoopdatanode1/hadoopdatanode2上有进程：DataNode, TaskTracker
```

## 关闭Hadoop

在hadoopnamenode上：

```text
stop-mapred.sh
stop-dfs.sh
```

## 其它

NameNode 管理界面：[http://hadoopnamenode:50070/](http://hadoopnamenode:50070/)

JobTracker 管理界面：[http://hadoopnamenode:50030/](http://hadoopnamenode:50030/)

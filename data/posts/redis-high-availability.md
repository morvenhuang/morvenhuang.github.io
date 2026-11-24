本文记录了 Redis 2.8.19 的安装、主从复制和 Sentinel 配置过程，命令与配置沿用 2014 年的测试环境。

Redis是一种内存数据库，以KEY-VALUE(即键值对)的形式存储数据。这篇文章主要介绍的是Redis安装及配置，所以不对Redis本身作详细介绍了。

## 下载

[http://redis.io/download](http://redis.io/download) (另外，Redis作者有一博客：[http://antirez.com/latest/0](http://antirez.com/latest/0)，有兴趣的可以关注)

## 解压

以redis-2.8.19.tar.gz为例，解压放在某目录下，这里选择/usr/local目录。

## 编译

进入/usr/local/redis-2.8.19，执行

```text
#make
```

如遇到gcc: Command not found错误，表示需要安装gcc

```text
#yum install gcc
```

如遇到zmalloc.h:50:31: error: jemalloc/jemalloc.h: No such file or directory错误，则要进入deps目录，执行：

```text
#make hiredis
#make jemalloc
#make linenoise
#make lua
```

然后再回到上级目录执行make即可。

## 启动

make成功之后，会在src目录生成redis-server等可执行文件，执行：

```text
#src/redis-server
```

或

```text
#src/redis-server &//加&为了可以让鼠标退出Redis的命令行
```

## 查看

```text
#ps aux|grep redis//查看是否有相应的进程
```

或

```text
#telnet localhost 6379//登录Redis
```

或更常用的

```text
#src/redis-cli//进入Redis交互命令行
```

这里介绍三个最基本的Redis命令(1)keys *，显示数据库中所有的key；(2)set foo bar，即为键foo设置值bar；(3)get foo，查看键foo的值。

## 关闭

```text
#src/redis-cli shutdown
```

## 日志

不管对什么应用程序，日志对于诊断工作有很大的作用，所以这里提一下Redis的日志。我们发现按上面的方法启动Redis，我们在系统中找不到Redis的日志，即便我们配置了/usr/local/redis-2.8.19/redis.conf文件中的logfile，指向/var/log/redis.log，仍然找不到日志。

同时，通过src/redis-cli CONFIG GET *来查看配置项，则提示命令参数错误ERR Wrong number of arguments for CONFIG GET

其实，造成这些问题的原因是在启动Redis时没有明确指定配置文件，可以这样指定：

```text
#src/redis-server redis.conf &//可以使用绝对路径来指定redis.conf
```

这样就一切正常了，日志文件也生成了。

## HA 配置

我们先介绍Redis怎么配置Replication，这里准备了两台机器：redisha1(153.65.171.99)，这个作master；redisha2(153.65.170.156)，这个我们用来作slave，修改它的redis.conf：

```text
slaveof 153.65.171.99 6379
```

表示我是redisha1的slave。这样设置之后，如果我们在redisha1中通过set foo bar2，在redisha2中通过get foo就可以取到值bar2。Redis自动完成了同步。

需要注意的是，配置完Replication后，作为slave的redisha2则进入read-only模式，也就是我们不能在redisha2上使用set命令写入数据了，set操作会收到(error) READONLY You can't write against a read only slave。

配置完Replication并不意味着就万事大吉了，试想如果redisha1宕机了，则基本意味着这套Redis系统失效了，因为这个时候剩下的redisha2是一个read-only的slave。

我们期望能有一个监控程序可以自动完成Redis Replication系统中的角色切换，而这正是我们要介绍的Redis Sentinel的设计目的（sentinel本身有哨兵、放哨之意）。同样，也准备了两台机器，都用来运行Sentinel：redisha3(153.65.171.168)，redisha4(153.65.170.145)，并且和前面的redisha1和redisha2一样，都部署了redis-2.8.19，所不同的是，要修改的是 sentinel.conf：

```text
sentinel monitor test 153.65.171.99   6379   2
```

这一行配置表示我要监控153.65.171.99这台机器上的Redis实例，并为它取了一个昵称叫test(默认是mymaster，如果你改动了，注意要搜索这个文件中所有mymaster的地方，并都改过来)。6379则是99上Redis监听的端口。

最后的2这个数字则是quorum数，对于一个Redis主从系统，可以有多个sentinel同时监控它，以避免当唯一的一个sentinel宕掉后影响redis系统的运行。多个sentinel之间采用一种“投票”机制，即某一sentinel发现某一redis实例宕掉了，它不能直接将它移出系统，而要询问所有的sentinel，只有当n个sentinel都投票同意说这个redis实例确实宕掉了，才能将它移出。而这个这n值正是由quorum参数指定。

## 启动 Sentinel

在redisha3与redisha4上，进入/usr/local/redis-2.8.19目录，执行：

```text
#src/redis-server sentinel.conf --sentinel
```

## 测试故障切换

关闭redisha1上的redis实例，则在sentinel的窗口中：

```text
+switch-master test 153.65.171.99 6379 153.65.170.156 6379
```

也就是说原来的redisha1(153.65.171.99)的master角色现在由redisha2(153.65.170.156)来承担了。

同时你会发现看到redisha2的redis.conf中的slaveof配置被移除了，因为它现在是master了。

启动redisha1上的redis，redisha1会被以slave的身份加入到redis系统中，可以在sentinel的窗口中看到：

```text
+convert-to-slave slave 153.65.171.99:6379 153.65.171.99 6379 @ test 153.65.170.156 6379
```

而redisha1中的redis.conf文件的最后一行会被自动添加上slaveof配置，指向现在的master即redisha2。

需要注意的是，这个自动发现新redis实例并把它作为slave加入到系统中的功能，在2.6版本中是没有的。

关闭redisha4上的sentinel，redisha3上可以看到：

```text
+sdown sentinel 153.65.170.145:26379 153.65.170.145 26379 @ test 153.65.170.156 6379
```

这个时候我关闭redisha2（它现在是master），sentinel无法进行自动角色切换了，这跟quorum的配置有关，因为它现在没有办法收到2个投票，这个上面介绍过了。

## SDOWN 与 ODOWN

在sentinel的输出中，经常可以看到这两个状态：

Subjectively Down condition (SDOWN) 主观觉得某redis实例已停止，即当前sentinel判断某redis实例已经停止。

Objectively Down condition (ODOWN) 客观判断某redis实例已停止，quorum参数指定的数量n，当当前有n个sentinel投票此redis已经宕了，则进入ODOWN状态。

## 其他常用命令

```text
#redis-cli -h {IP} -p 26379 info Sentinel//查看sentinel的信息
#redis-cli -h {IP} -p 6379 info Replication//查看replication的信息
#redis-cli -h {IP} -p 26379 sentinel slaves test//查看所有slave的信息。test是sentinel.conf中配置的master的昵称
```

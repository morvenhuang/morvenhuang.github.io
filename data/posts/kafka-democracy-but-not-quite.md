今天来讲讲 Kafka 的治理结构，其实对照人类社会的组织与运转，还是很好理解的。

# Broker, Voter, Observer

Kafka 集群的节点称为 Broker，每个 Broker 本质上是一个承载分区副本的进程。在现代 Kafka 中，集群里还有一类角色：Controller。Controller 负责管理集群元数据——谁在线、有哪些 Topic、每个分区的副本放在哪、谁是 Leader。

那么，Controller 这个权威是怎么出来的？它是选民选举出来的。不过，并不是每个节点都有投票权。真正参与选举的，是配置里那份 voter list：

```properties
controller.quorum.voters=1@controller1:9093,2@controller2:9093,3@controller3:9093
```

在这份名单里，你才是选民，名单外只能叫观察者（observer）


# Raft

voter 构成里一个 Raft Group，进行典型的 Raft 选举：每一轮选举有任期（term），候选人拉票，拿到多数票的人成为这一届的 Leader——在 Kafka 的语境里，这个 Leader 就叫 active Controller。

选出 Leader 之后，元数据的写入就有了唯一的入口：只有 active Controller 能往元数据日志里追加变更记录。变更日志被复制到多数 voter 上才算 commit。

Kafka 的元数据存储于内部 Topic `__cluster_metadata`，它有一点特殊是，只有单分区，而这个分区的 leader replica 必须位于 Controller 上，剩下的 follower replica(s)则位于其他的 voter 节点上。


# 业务 topic 呢？

很容易根据上面的“民主”过程，推论业务 Topic 的分区 leader replica 也是选举产生的。但实际情况不是这样，它们是由 Controller 这个威权直接指派的。

创建 Topic 时，Controller 上的分配逻辑按 Broker 列表、机架信息、是否被 fenced 等约束，生成每个分区的副本列表。这个列表的第一个副本，通常就是该分区的 Leader。

当某个分区的 Leader 挂掉时，Controller 会在 ISR（in-sync replicas）里挑一个副本接任，仍然是一个“指派”的过程。


# 选举 vs 任命

为什么不让每个分区的副本也选一次 Leader？

因为用户数据面和元数据的量级完全不同。一个中等规模的集群可能就有几万个分区，每次 Leader 变更都走一轮共识，意味着每个分区都要维护心跳、投票、日志匹配这些状态，成本太高。

这个策略其实和人类社会一样：被决定对象的规模、决策频率、以及决策错误的代价，这三个因素决定了你的选择。规模小、频率低、错误代价高——适合选举；规模大、频率高、可校验可重放——适合指派加审计。

无所谓“先进”与否，所有都是代价的权衡。

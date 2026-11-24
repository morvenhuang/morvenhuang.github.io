这个示例实现了一个 .NET 进程监视器，主要功能有三项。

1. 查看进程的 CPU 占用率、内存用量、父进程、执行路径和创建者。
2. 中止现有进程，或启动新进程。
3. 配置要监控的目标进程和刷新间隔。

最终效果如下。

![进程监视器运行截图](https://images.cnblogs.com/cnblogs_com/kissknife/proce.jpg)

下面给出部分代码。启动和中止进程等操作可以通过 `Process` 类实现。

## 1. 使用 WMI 获取父进程 ID 和创建者

WMI 查询的开销较大，适合在需要时查询，应避免放在循环中频繁刷新。

先添加命名空间。

```csharp
using System.Management;
```

```csharp
        /// <summary>
        /// 使用Wmi获取指定进程的创建者等信息
        /// </summary>
        /// <param name="pID">进程ID</param>
        private void FillDetailUseWmi(int pID)
        {
            ManagementObjectSearcher searcher = new ManagementObjectSearcher("Select * From Win32_Process Where ProcessID=" + pID);
            ManagementObjectCollection moc = searcher.Get();

            ManagementOperationObserver observer = new ManagementOperationObserver();
            HandleObjectReady hor = new HandleObjectReady();
            //监测异步方法是否已成功返回
            observer.ObjectReady += new ObjectReadyEventHandler(hor.Done);

            foreach (ManagementObject mo in moc)
            {
                //异步调用该对象的GetOwner方法，获取进程创建者
                mo.InvokeMethod(observer, "GetOwner", null);
                //等待异步调用返回
                while (!hor.Complete)
                {
                    System.Threading.Thread.Sleep(500);
                }

                string user = "";
                //判断获取用户名的操作是否成功
                if (hor.Obj["returnValue"].ToString() == "0")
                {
                    user = hor.Obj.Properties["User"].Value.ToString();
                }
                //判断字典中是否已移除该项
                if (!this.mDict.ContainsKey(pID))
                {
                    return;
                }
                if (mo["ParentProcessID"] != null && this.mDict.ContainsKey(Convert.ToInt32(mo["ParentProcessID"])))
                {
                    //根据父进程ID获取父进程名称
                    this.mDict[pID].ParentProce = this.mDict[Convert.ToInt32(mo["ParentProcessID"])].ProceName;
                }
                this.mDict[pID].Creator = user;

                //触发刷新进程详细信息事件
                if (this.HandleDetailList != null)
                {
                    this.HandleDetailList(this.mDict[pID]);
                }
            }

            //释放资源
            searcher.Dispose();
            searcher = null;
            moc.Dispose();
            moc = null;
            observer = null;
            hor = null;
        }


    /// <summary>
    /// 该类用于监测Wmi异步调用方法是否已经返回
    /// </summary>
    public class HandleObjectReady
    {
        private bool complete = false;
        private ManagementBaseObject obj;

        public void Done(object sender, ObjectReadyEventArgs e)
        {
            complete = true;
            obj = e.NewObject;
        }

        public bool Complete
        {
            get
            {
                return complete;
            }
        }

        public ManagementBaseObject Obj
        {
            get
            {
                return obj;
            }
        }
    }
```

## 2. 使用性能计数器计算 CPU 利用率

### 2.1 计算过程

1. 通过性能计数器获取空闲项 `Idle` 的 CPU 占用率 `r1`。
2. 读取各进程的 `Process.TotalProcessorTime` 并求和，得到非空闲进程的 CPU 时间 `t1`。空闲项的 CPU 时间无法通过 `Process` 类获取。
3. 用 `t1/(100-r1)` 求得总 CPU 时间 `t`。
4. 对单个进程，用本次读到的 `TotalProcessorTime`（`Tnew`）减去上次记录的值（`told`）。再用 `(Tnew-told)/t` 得到该进程的 CPU 占用率。

### 2.2 性能计数器

通过 `new PerformanceCounter("Process", "% Processor Time", "进程名称")` 创建计数器，再调用 `NextValue` 获取进程的 CPU 占用率。第一次采样会返回 0，从第二次采样开始使用结果。

### 2.3 Idle 的含义

`Idle` 用于表示 CPU 的空闲资源。这个比例越高，机器就越空闲。

### 2.4 多核与超线程

在多核或支持超线程的 CPU 上，计数器返回的 `Idle` 占用率可能超过 100%。用该值除以总 CPU 利用率，即可得到归一化后的空闲占比。

先添加命名空间。

```csharp
using System.Diagnostics;
```

```csharp
        /// <summary>
        /// 性能计数器，用于获取CPU空闲百分比
        /// </summary>
        private static PerformanceCounter mIdle = new PerformanceCounter("Process", "% Processor Time", "Idle");
        /// <summary>
        /// 性能计数器，用于获取CPU总利用率
        /// </summary>
        private static PerformanceCounter mTotal = new PerformanceCounter("Process", "% Processor Time", "_Total");

        private void FillNeedRefreshInfo(params Process[] pCurrentAll)
        {
            …………
            //以下计算CPU利用率
            this.mCurrentTotalCpuTime = this.CalCurrentTotalCpuTime();
            for (int i = 0; i < pCurrentAll.Length; i++)
            {
                //空闲进程idle
                if (pCurrentAll[i].Id == 0)
                {
                    this.mDict[pCurrentAll[i].Id].CpuPercent = this.mIdleCpuPercent;
                }
                else
                {
                    try
                    {
                        //无法保证进程不会中途退出，此时无法获取其Cpu时间
                        long ms = (long)pCurrentAll[i].TotalProcessorTime.TotalMilliseconds;
                        double d = (ms - this.mDict[pCurrentAll[i].Id].OldCpuTime) * 1.0 / this.mCurrentTotalCpuTime;
                        this.mDict[pCurrentAll[i].Id].CpuPercent = d;
                        this.mDict[pCurrentAll[i].Id].OldCpuTime = ms;
                    }
                    catch
                    {
                    }
                }

                //调用刷新事件
                if (this.HandleProceRefresh != null)
                {
                    this.HandleProceRefresh(this.mDict[pCurrentAll[i].Id], 100 - this.mIdleCpuPercent);
                }
            }
        }


        private double CalCurrentTotalCpuTime()
        {
            double d = 0;
            //获取性能计数器值
            double idlePercent = mIdle.NextValue();
            double totalPercent = mTotal.NextValue();
            //避免除0异常
            if (totalPercent == 0)
            {
                this.mIdleCpuPercent = 0;
            }
            else
            {
                //可能遇到多核或超线程CPU，CPU空闲进程比率不能直接使用计数器的值
                this.mIdleCpuPercent = idlePercent * 100 / totalPercent;
            }

            //以下获取上一次计算至当前总的非空闲CPU时间
            foreach (Process p in this.mCurrentAll)
            {
                //对空闲进程及中途退出的进程不做处理
                if (p.Id == 0 || p.HasExited)
                {
                    continue;
                }

                if (this.mDict ==null || !this.mDict.ContainsKey(p.Id))
                {
                    d += p.TotalProcessorTime.TotalMilliseconds;
                }
                else
                {
                    d += p.TotalProcessorTime.TotalMilliseconds - this.mDict[p.Id].OldCpuTime;
                }
            }

            //当前非空闲CPU时间/当前非空闲时间所占比率=当前总CPU时间
            //return d / (totalPercent - idlePercent);
            return d / (100 - mIdleCpuPercent);
        }
```

[下载源码（RAR）](https://files.cnblogs.com/KissKnife/ProcessInfo.rar)

首发于 2007 年 3 月 20 日 21:33（UTC+8）。[博客园原文](https://www.cnblogs.com/morvenhuang/archive/2007/03/20/681739.html)

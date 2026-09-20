import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowDown, ArrowLeftRight, BarChart3, Check, ChevronDown, ChevronRight,
  CircleHelp, Copy, ExternalLink, Gauge, Hexagon, Info, LockKeyhole, Menu,
  Network, RefreshCw, Settings2, ShieldCheck, Sparkles, Wallet, X, Zap
} from 'lucide-react';
import './styles.css';

const navItems = [
  { id: 'swap', label: '交易兑换', en: 'SWAP' },
  { id: 'staking', label: '筑巢分红', en: 'STAKING' },
  { id: 'roadmap', label: '蜂群路线', en: 'ROADMAP' },
  { id: 'dashboard', label: '蜂巢数据', en: 'DATA' },
  { id: 'about', label: '关于蜜蜂', en: 'ABOUT' },
];

const wallets = [
  { name: 'MetaMask', icon: 'M', tone: '#f6851b' },
  { name: 'OKX Wallet', icon: 'OK', tone: '#fff' },
  { name: 'Trust Wallet', icon: 'T', tone: '#3375bb' },
];

function BrandMark({ small = false }) {
  return <div className={`brand-mark ${small ? 'small' : ''}`} aria-label="小蜜蜂">
    <Hexagon className="mark-outline" />
    <div className="bee-glyph"><span className="wing left"/><span className="wing right"/><span className="bee-body"/></div>
  </div>;
}

function App() {
  const [page, setPage] = useState('swap');
  const [walletOpen, setWalletOpen] = useState(false);
  const [connected, setConnected] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (text) => { setToast(text); setTimeout(() => setToast(''), 2500); };
  const navigate = (id) => { setPage(id); setMobile(false); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const connect = (name) => { setConnected(true); setWalletOpen(false); showToast(`${name} 已连接至 BSC`); };

  return <div className="app-shell">
    <div className="ambient-grid" />
    <header className="topbar">
      <button className="brand" onClick={() => navigate('swap')}>
        <BrandMark small />
        <span className="brand-copy"><strong>小蜜蜂</strong><small>HONEYBEE PROTOCOL</small></span>
      </button>
      <nav className={mobile ? 'nav open' : 'nav'}>
        {navItems.map(item => <button key={item.id} className={page === item.id ? 'active' : ''} onClick={() => navigate(item.id)}>
          <span>{item.label}</span><small>{item.en}</small>
        </button>)}
      </nav>
      <div className="header-actions">
        <div className="network-pill"><i /> BSC</div>
        <button className="wallet-button" onClick={() => setWalletOpen(true)}>
          <Wallet size={16} /> {connected ? '0x7A21...B39F' : '连接钱包'}
        </button>
        <button className="icon-button menu-button" onClick={() => setMobile(v => !v)} aria-label="打开菜单">{mobile ? <X/> : <Menu/>}</button>
      </div>
    </header>

    <main key={page} className="page-enter">
      {page === 'swap' && <SwapPage connected={connected} onConnect={() => setWalletOpen(true)} showToast={showToast}/>} 
      {page === 'staking' && <StakingPage connected={connected} onConnect={() => setWalletOpen(true)} showToast={showToast}/>} 
      {page === 'roadmap' && <RoadmapPage/>}
      {page === 'dashboard' && <DashboardPage/>}
      {page === 'about' && <AboutPage/>}
    </main>

    <footer><div className="footer-brand"><BrandMark small/><span>小蜜蜂 HONEYBEE</span></div><span>Built on BNB Smart Chain</span><span>© 2026 HONEYBEE PROTOCOL</span></footer>
    {walletOpen && <WalletModal onClose={() => setWalletOpen(false)} onConnect={connect}/>} 
    {toast && <div className="toast"><Check size={17}/>{toast}</div>}
  </div>;
}

function PageIntro({ eyebrow, title, accent, subtitle, children }) {
  return <div className="page-intro">
    <div><div className="eyebrow"><span />{eyebrow}</div><h1>{title}<em>{accent}</em></h1><p>{subtitle}</p></div>{children}
  </div>;
}

function SwapPage({ connected, onConnect, showToast }) {
  const [amount, setAmount] = useState('');
  const [reversed, setReversed] = useState(false);
  const [settings, setSettings] = useState(false);
  const [slippage, setSlippage] = useState('0.5');
  const output = amount ? (Number(amount) * (reversed ? 163420 : 0.00000612)).toLocaleString('en-US', { maximumFractionDigits: reversed ? 0 : 8 }) : '';
  const from = reversed ? 'BNB' : 'BEE'; const to = reversed ? 'BEE' : 'BNB';
  return <section className="main-width swap-page">
    <PageIntro eyebrow="DEX / BNB SMART CHAIN" title="蜂巢" accent="交易" subtitle="无缝兑换，极速上链。每一次交易，都是蜂群共识的流动。">
      <div className="intro-stat"><span>实时价格</span><strong>$0.0038 <b>+12.46%</b></strong><small><i/> LIVE ON BSC</small></div>
    </PageIntro>
    <div className="swap-layout">
      <div className="bee-showcase">
        <div className="orbit orbit-one"/><div className="orbit orbit-two"/>
        <div className="hero-hex"><BrandMark/><div className="coin-rim"/></div>
        <div className="floating-tag tag-a"><Zap size={14}/> BSC 极速确认</div>
        <div className="floating-tag tag-b"><ShieldCheck size={14}/> 流动性已锁定</div>
        <div className="honeycomb-art">{Array.from({length: 12}).map((_,i)=><i key={i}/>)}</div>
        <div className="showcase-copy"><span>HONEYBEE / BEE</span><strong>群体即共识</strong><p>Born on BSC · Powered by Community</p></div>
      </div>
      <div className="swap-card panel">
        <div className="panel-head"><div><small>INSTANT SWAP</small><h2>兑换</h2></div><button className="icon-button" onClick={() => setSettings(v=>!v)} aria-label="交易设置"><Settings2 size={19}/></button></div>
        {settings && <div className="settings-row"><span>滑点容差</span>{['0.1','0.5','1.0'].map(v=><button key={v} onClick={()=>setSlippage(v)} className={slippage===v?'selected':''}>{v}%</button>)}</div>}
        <TokenInput label="支付" token={from} value={amount} setValue={setAmount}/>
        <div className="swap-direction"><button onClick={()=>setReversed(v=>!v)}><ArrowDown size={18}/></button><span>1 BEE ≈ 0.00000612 BNB</span></div>
        <TokenInput label="接收" token={to} value={output} readonly/>
        <div className="trade-info"><div><span>最小接收</span><b>{output ? `${(Number(String(output).replaceAll(',',''))*(1-Number(slippage)/100)).toLocaleString()} ${to}` : '--'}</b></div><div><span>价格影响</span><b className="positive">&lt; 0.01%</b></div><div><span>路由</span><b>BEE → WBNB</b></div></div>
        <button className="primary-action" onClick={() => connected ? showToast(amount ? '兑换请求已提交' : '请输入兑换数量') : onConnect()}>{connected ? '立即兑换' : '连接钱包开始交易'}<ArrowLeftRight size={18}/></button>
        <div className="secure-note"><ShieldCheck size={15}/> 滑点保护已开启 · 交易由智能合约执行</div>
      </div>
    </div>
    <div className="trust-strip"><div><LockKeyhole/><span><b>流动性锁定</b><small>合约锁仓，代码守护</small></span></div><div><Gauge/><span><b>极速交易</b><small>BSC 平均 3 秒确认</small></span></div><div><Network/><span><b>链上透明</b><small>所有记录公开可查</small></span></div></div>
  </section>;
}

function TokenInput({ label, token, value, setValue, readonly }) {
  return <div className="token-box"><div className="input-meta"><span>{label}</span><span>余额：--</span></div><div className="token-row"><input aria-label={`${label}数量`} placeholder="0.00" value={value} readOnly={readonly} onChange={e=>setValue?.(e.target.value.replace(/[^0-9.]/g,''))}/><button><TokenLogo token={token}/><b>{token}</b><ChevronDown size={15}/></button></div>{!readonly && <button className="max" onClick={()=>setValue('10000')}>MAX</button>}</div>
}
function TokenLogo({token}) { return <span className={`token-logo ${token.toLowerCase()}`}>{token==='BEE'?'B':'◆'}</span> }

function StakingPage({connected,onConnect,showToast}) {
  const [period,setPeriod]=useState(90); const [amount,setAmount]=useState('');
  const weights={30:'1.0×',90:'1.6×',180:'2.4×'}; const apys={30:'36.8%',90:'58.2%',180:'87.6%'};
  return <section className="main-width">
    <PageIntro eyebrow="STAKING / HONEY REWARDS" title="筑巢" accent="分红" subtitle="锁仓共识，共享蜜糖。时间沉淀价值，耐心收获红利。"/>
    <div className="metrics"><Metric label="总锁仓量 TVL" value="12,846,320" unit="BEE" trend="+8.2%"/><Metric label="当前年化 APY" value={apys[period]} unit="" trend="动态收益"/><Metric label="累计释放分红" value="286.42" unit="BNB" trend="链上可查"/></div>
    <div className="staking-grid">
      <div className="panel stake-panel"><div className="panel-head"><div><small>BUILD YOUR HIVE</small><h2>开始筑巢</h2></div><div className="status-chip"><i/> CONTRACT ACTIVE</div></div>
        <div className="stake-label"><span>锁仓数量</span><span>钱包余额：-- BEE</span></div>
        <div className="stake-input"><input value={amount} onChange={e=>setAmount(e.target.value.replace(/[^0-9.]/g,''))} placeholder="输入数量"/><div><TokenLogo token="BEE"/><b>BEE</b></div><button onClick={()=>setAmount('10000')}>MAX</button></div>
        <div className="period-title"><span>选择锁仓周期</span><small>周期越长，权重越高</small></div>
        <div className="period-grid">{[30,90,180].map(p=><button key={p} onClick={()=>setPeriod(p)} className={period===p?'active':''}><span>{p} 天</span><small>{weights[p]} 权重</small>{period===p&&<Check size={14}/>}</button>)}</div>
        <div className="estimate"><div><span>预计年化收益</span><b>{apys[period]}</b></div><div><span>权重倍数</span><b>{weights[period]}</b></div><div><span>预计解锁时间</span><b>{new Date(Date.now()+period*86400000).toLocaleDateString('zh-CN')}</b></div></div>
        <button className="primary-action" onClick={()=>connected?showToast(amount?'锁仓请求已提交':'请输入锁仓数量'):onConnect()}>{connected?'授权并确认锁仓':'连接钱包开始锁仓'}<LockKeyhole size={18}/></button>
      </div>
      <div className="panel position-panel"><div className="panel-head"><div><small>MY POSITION</small><h2>我的蜂巢</h2></div><span className="hex-number">01</span></div>
        <div className="empty-position"><div className="empty-hive"><Hexagon/><LockKeyhole/></div><h3>尚未建立蜂巢</h3><p>锁仓 BEE 后，你的仓位与实时收益将在这里展示。</p></div>
        <div className="position-data"><div><span>我的质押</span><b>-- BEE</b></div><div><span>待领取收益</span><b className="gold">-- BNB</b></div></div>
        <div className="dual-actions"><button disabled>解除锁仓</button><button disabled>领取收益</button></div>
        <div className="reward-note"><Sparkles size={16}/><p>分红池由链上生态收益自动注入<br/><b>真实 · 透明 · 可验证</b></p></div>
      </div>
    </div>
  </section>
}
function Metric({label,value,unit,trend}) { return <div className="metric"><span>{label}</span><strong>{value} <small>{unit}</small></strong><em>{trend}</em></div> }

const roadmap=[
  ['01','筑巢','创世期','建立蜜蜂 IP 核心共识，完成 BSC 与 Flap 平台的首发部署。集结初始蜂群，完成社区基石构建。','已完成'],
  ['02','起飞','启动期','蜜蜂正式登陆 Flap 平台。开启链上交易，激活首批传播节点，释放初代 Meme 势能。','进行中'],
  ['03','酿蜜','共建期','开启共建工坊与社区激励计划，鼓励内容创作与裂变传播。拓展生态权益，沉淀共识。','待启动'],
  ['04','蜂群','繁荣期','深化链上应用场景，打通多元化生态，实现价值与共识的双向循环，形成自生长网络。','待启动'],
  ['05','蜂巢','飞升期','全域生态融合，链接更多 Web3 资源与合作伙伴，实现蜂群自治，打造真正的链上蜂巢。','终极愿景'],
];
const ecosystem=[['01','蜜蜂 Swap','去中心化链上交易','规划中'],['02','蜜蜂 Room','蜂群社区空间','规划中'],['03','蜜蜂 Mint 平台','一站式资产铸造','规划中'],['04','蜜蜂看线平台','专业行情与链上数据','规划中'],['05','蜜蜂发射平台','项目启动与资产发行','规划中'],['06','蜜蜂 NFT 交易市场','NFT 发行、展示与交易','规划中'],['07','蜜蜂专业市值管理工具','面向项目方的专业管理套件','规划中'],['08','蜜蜂 BSC Bot / SOL Bot','0 区块执行 · 反 MEV','规划中']];
function RoadmapPage(){return <section className="main-width roadmap-page"><PageIntro eyebrow="THE SWARM ERA / 2026+" title="蜂群" accent="纪元" subtitle="从筑巢到飞升，一场由共识驱动的进化之路。"/><div className="roadmap-progress"><span>EVOLUTION PROGRESS</span><div><i/></div><b>00 / 05</b></div><div className="timeline">{roadmap.map((r,i)=><article key={r[0]} className={i<2?'reached':''}><div className="time-node"><span>{r[0]}</span></div><div className="phase-card"><div className="phase-top"><div><small>PHASE {r[0]} · {r[2]}</small><h2>{r[1]}</h2></div><span className="phase-status"><i/>{r[4]}</span></div><p>{r[3]}</p><div className="phase-foot"><span>{['CORE CONSENSUS','TOKEN LAUNCH','COMMUNITY BUILDER','ECOSYSTEM GROWTH','DAO GOVERNANCE'][i]}</span><Hexagon size={20}/></div></div></article>)}</div><div className="ecosystem-block"><div className="ecosystem-head"><div><div className="eyebrow"><span/>BEE ECOSYSTEM / FULL STACK</div><h2>蜜蜂生态矩阵</h2></div><p>从交易、社区到资产发行与专业工具，构建完整的蜂群基础设施。</p></div><div className="ecosystem-grid">{ecosystem.map((x,i)=><article key={x[0]} className={i<0?'is-live':''}><div className="eco-meta"><span>{x[0]}</span><b>{x[3]}</b></div><h3>{x[1]}</h3><p>{x[2]}</p>{i<0&&<Check size={18}/>}</article>)}</div></div></section>}

function DashboardPage(){
 const values=[28,34,31,43,40,52,49,64,57,71,69,84,79,92,88,108,102,121,115,132,129,145];
 const points=values.map((v,i)=>`${i*(800/(values.length-1))},${190-v}`).join(' ');
 return <section className="main-width"><PageIntro eyebrow="ON-CHAIN ANALYTICS / LIVE" title="蜂巢" accent="数据" subtitle="链上数据，一目了然。每一笔增长都有迹可循。"><div className="live-badge"><i/> 数据实时同步中</div></PageIntro>
 <div className="metrics four"><Metric label="总市值 MARKET CAP" value="$3.82M" trend="+12.46%"/><Metric label="持币地址 HOLDERS" value="18,429" trend="+328 今日"/><Metric label="24H 交易量 VOLUME" value="$486.2K" trend="+24.8%"/><Metric label="已销毁 BURNED" value="6.8M" unit="BEE" trend="总量 6.8%"/></div>
 <div className="chart-grid"><div className="panel chart-panel"><div className="chart-header"><div><small>BEE / USD</small><h2>$0.00382 <em>+12.46%</em></h2></div><div className="chart-tabs"><button>1H</button><button>1D</button><button className="active">1W</button><button>1M</button></div></div><div className="chart-area"><div className="y-axis"><span>$0.005</span><span>$0.004</span><span>$0.003</span><span>$0.002</span></div><svg viewBox="0 0 800 200" preserveAspectRatio="none"><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f6be3c" stopOpacity=".32"/><stop offset="1" stopColor="#f6be3c" stopOpacity="0"/></linearGradient></defs><polygon points={`0,200 ${points} 800,200`} fill="url(#area)"/><polyline points={points} fill="none" stroke="#f6be3c" strokeWidth="3" vectorEffect="non-scaling-stroke"/></svg><div className="x-axis"><span>SEP 14</span><span>SEP 16</span><span>SEP 18</span><span>SEP 20</span></div></div></div>
 <div className="panel activity"><div className="panel-head"><div><small>LIVE FEED</small><h2>最新交易</h2></div><RefreshCw size={17}/></div>{[['买入','0x71...4C2','124,800 BEE','2 秒前'],['卖出','0xA9...18F','48,200 BEE','18 秒前'],['买入','0x3B...92D','286,500 BEE','41 秒前'],['买入','0xF2...7A0','68,900 BEE','1 分钟前']].map((x,i)=><div className="tx" key={i}><span className={x[0]==='买入'?'buy':'sell'}>{x[0]}</span><b>{x[1]}</b><strong>{x[2]}</strong><small>{x[3]}</small></div>)}</div></div>
 <div className="data-foot"><ShieldCheck/> 数据实时同步 BSC 链上，透明可查 <button>查看区块浏览器 <ExternalLink size={14}/></button></div></section>
}

const faqs=[['为什么选择蜜蜂作为 IP？','蜜蜂代表秩序、协作与传播。它不是喧闹的符号，而是共识与生态的化身，天然契合 Web3 的社区精神。'],['蜜蜂在 Flap 平台首发意味着什么？','Flap 是 BSC 生态的创新发射平台。蜜蜂借助其流动性优势，快速激活链上共识。'],['如何参与蜜蜂的生态共建？','加入官方社群，参与内容传播与 Meme 创作。后续共建工坊开放后，持有者均可参与生态治理。'],['如何获取最新项目进展？','关注官方 X 及社群公告。路线图里程碑、上线时间与合约信息均会第一时间同步。']];
function AboutPage(){const [open,setOpen]=useState(0);return <section className="main-width about-page"><PageIntro eyebrow="ABOUT HONEYBEE / OUR SIGNAL" title="一只蜜蜂是信号，" accent="一群蜜蜂是共识。" subtitle="我们不追逐喧闹，我们创造秩序。"/><div className="manifesto"><div className="manifesto-mark"><BrandMark/><span>EST. 2026<br/>BSC</span></div><div><small>THE HONEYBEE MANIFESTO</small><h2>在区块之间，<br/>我们铸造蜂巢。</h2><p>蜜蜂不是喧闹的符号，而是秩序、协作与传播的化身。在 BSC 的区块之间，我们铸造蜂巢；在 Flap 的浪潮之上，我们释放共识。</p><div className="project-facts"><div><span>IP 名称</span><b>小蜜蜂 BEE</b></div><div><span>发行链</span><b>BNB Smart Chain</b></div><div><span>首发平台</span><b>Flap</b></div><div><span>代币机制</span><b>Meme · 锁仓分红 · 共建</b></div></div></div></div>
 <div className="faq-section"><div className="faq-title"><small>FREQUENTLY ASKED</small><h2>你可能想知道</h2><p>关于小蜜蜂生态的核心问题</p></div><div className="faq-list">{faqs.map((f,i)=><button key={i} className={open===i?'open':''} onClick={()=>setOpen(open===i?-1:i)}><span className="faq-num">0{i+1}</span><div><b>{f[0]}</b>{open===i&&<p>{f[1]}</p>}</div><ChevronDown/></button>)}</div></div>
 <div className="join-band"><div><small>JOIN THE SWARM</small><h2>成为蜂群的一部分</h2><p>共识不靠等待发生，它由每一位参与者共同创造。</p></div><button>加入官方社区 <ChevronRight/></button></div></section>}

function WalletModal({onClose,onConnect}){return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><div className="wallet-modal"><div className="modal-head"><div><small>CONNECT TO HIVE</small><h2>连接你的钱包</h2></div><button className="icon-button" onClick={onClose}><X/></button></div><p>选择钱包以连接 BNB Smart Chain</p><div className="wallet-list">{wallets.map(w=><button key={w.name} onClick={()=>onConnect(w.name)}><span style={{color:w.tone}}>{w.icon}</span><b>{w.name}</b><small>检测到</small><ChevronRight/></button>)}</div><div className="modal-network"><Network/><div><b>BNB Smart Chain</b><small>连接后将自动切换至 BSC 主网</small></div><span><i/> 正常</span></div><div className="terms"><ShieldCheck/> 连接即表示你同意服务条款与隐私政策</div></div></div>}

createRoot(document.getElementById('root')).render(<App />);

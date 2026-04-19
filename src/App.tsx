import { useState, useCallback, useEffect, Suspense } from 'react';
import { Globe, Play, Settings, ShieldCheck, ArrowRight, RefreshCcw, Hammer, Activity, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { soundManager } from './lib/sounds';
import { Level1 } from './levels/Level1';
import { Level2 } from './levels/Level2';
import { Level3 } from './levels/Level3';
import { Level4 } from './levels/Level4';
import { Level5 } from './levels/Level5';
import { Level6 } from './levels/Level6';
import { Level7 } from './levels/Level7';
import { Language } from './types';

export default function App() {
  const [language, setLanguage] = useState<Language>('zh');
  const [currentLevel, setCurrentLevel] = useState<number | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [stars, setStars] = useState<boolean[]>([false, false, false, false, false, false, false]);
  const [userName, setUserName] = useState("");
  const [showCertificate, setShowCertificate] = useState(false);

  const collectStar = useCallback((index: number) => {
    setStars(prev => {
      const next = [...prev];
      next[index] = true;
      return next;
    });
  }, []);

  const exitLevel = useCallback((starIndex: number | null, success: boolean) => {
    if (success && starIndex !== null) {
      collectStar(starIndex);
    }
    // Explicitly release pointer lock and ensure cursor is visible
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
    document.body.style.cursor = 'auto';
    setCurrentLevel(null);
  }, [collectStar]);

  const totalStars = stars.filter(s => s).length;
  const allStarsCollected = totalStars >= 7;

  const toggleLanguage = useCallback(() => {
    setLanguage(l => l === 'en' ? 'zh' : 'en');
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'l') {
        toggleLanguage();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    
    const resumeAudio = () => {
      soundManager.playTone(0, 'sine', 0.01, 0); // Silent tone to trigger resume
    };
    window.addEventListener('click', resumeAudio);
    window.addEventListener('keydown', resumeAudio);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('click', resumeAudio);
      window.removeEventListener('keydown', resumeAudio);
    };
  }, [toggleLanguage]);

  const t = {
    en: {
      title: "Hotmeer O&M Training",
      subtitle: "Professional Logistics Simulation",
      selectLevel: "Select Training Module",
      level1Title: "Warehouse Maintenance",
      level1Desc: "Monitor AGV fleet and handle critical failures.",
      level2Title: "Conveyor Maintenance",
      level2Desc: "Handle cargo jams and system resets on conveyor lines.",
      level3Title: "Rack Installation",
      level3Desc: "Learn the basic flow of rack assembly and safety.",
      level4Title: "Factory Reset",
      level4Desc: "Complete robot setup and charging station config.",
      level5Title: "Obstacle Avoidance",
      level5Desc: "Master the use of safety devices and AGV avoidance.",
      level6Title: "Line Marking & Sticking",
      level6Desc: "Learn QR positioning, alignment, and application flow.",
      level7Title: "AGV Maintenance",
      level7Desc: "Diagnose and repair AGV hardware failures following manual.",
      start: "START TRAINING",
      anyKey: "PRESS ANY KEY TO START",
      lang: "English",
      stars: "Stars Collected",
      certificate: "Training Certificate",
      certDesc: "This certifies that the following individual has completed all Hotmeer O&M training modules with excellence.",
      download: "Download Certificate",
      enterName: "Enter Your Name",
      congrats: "Congratulations!",
      allModules: "All modules completed",
      back: "Back",
      starReq: "Star Requirement",
      level1Star: "Deliver > 10 packages",
      level2Star: "Clear 15 jammed boxes",
      level3Star: "Successfully install rack",
      level4Star: "Successfully complete factory reset",
      level5Star: "Successfully complete obstacle course",
      level6Star: "Successfully complete marking",
      level7Star: "Repair 3 AGVs successfully",
      issuer: "Hotmeer Empowerment Department",
      certDescEn: "This certifies that the following individual has completed all Hotmeer O&M training modules with excellence.",
      certDescZh: "兹证明以下人员已圆满完成 Hotmeer 运维培训全部模块，表现优异，特发此证。"
    },
    zh: {
      title: "Hotmeer运维培训软件",
      subtitle: "专业物流仿真系统",
      selectLevel: "选择培训模块",
      level1Title: "仓库日常维护",
      level1Desc: "监控AGV车队并处理突发故障。",
      level2Title: "输送线维护实操",
      level2Desc: "处理输送线货物堵塞与系统重置操作。",
      level3Title: "货架安装流程",
      level3Desc: "学习货架组装的基本流程与安全规范。",
      level4Title: "出厂设置调试",
      level4Desc: "完成机器人初始化设置与充电桩配置。",
      level5Title: "避障器使用教学",
      level5Desc: "掌握安全避障设备的使用与AGV避让技巧。",
      level6Title: "画线贴码实操",
      level6Desc: "学习二维码定位、对齐与贴码的完整流程。",
      level7Title: "机器人维修实操",
      level7Desc: "根据维修手册诊断并修复AGV硬件故障。",
      start: "开始培训",
      anyKey: "按任意键开始",
      lang: "中文",
      stars: "已收集星星",
      certificate: "培训结业证书",
      certDesc: "兹证明以下人员已圆满完成 Hotmeer 运维培训全部模块，表现优异，特发此证。",
      download: "保存证书到本地",
      enterName: "请输入您的姓名",
      congrats: "恭喜完成！",
      allModules: "已完成所有培训模块",
      back: "返回",
      starReq: "星星获得条件",
      level1Star: "成功投递超过10个包裹",
      level2Star: "处理15个卡箱",
      level3Star: "成功安装货架",
      level4Star: "成功完成出厂设置调试",
      level5Star: "成功完成避障测试",
      level6Star: "成功完成画线贴码",
      level7Star: "成功维修3台机器人",
      issuer: "Hotmeer 赋能部",
      certDescEn: "This certifies that the following individual has completed all Hotmeer O&M training modules with excellence.",
      certDescZh: "兹证明以下人员已圆满完成 Hotmeer 运维培训全部模块，表现优异，特发此证。"
    }
  }[language];

  const handleDownloadCert = () => {
    const certText = `
      ==========================================
      CERTIFICATE OF COMPLETION / 培训结业证书
      ==========================================
      
      ${t.certDescEn}
      ${t.certDescZh}
      
      NAME / 姓名: ${userName || "Hotmeer Trainee / 培训生"}
      DATE / 日期: ${new Date().toLocaleDateString()}
      STATUS / 状态: CERTIFIED PROFESSIONAL / 专业认证
      
      ISSUED BY / 颁发部门: Hotmeer Empowerment Department / Hotmeer 赋能部
      Hotmeer O&M Training System v3.1
      ==========================================
    `;
    const blob = new Blob([certText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Hotmeer_Certificate_${userName || 'Trainee'}.txt`;
    link.click();
  };

  return (
    <div className="w-full h-screen bg-[#050505] text-white font-sans overflow-hidden relative selection:bg-blue-500/30">
      {/* Falling Particles Effect */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden opacity-30">
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ y: -100, x: Math.random() * window.innerWidth, rotate: 0 }}
            animate={{ 
              y: window.innerHeight + 100,
              rotate: 360,
              x: (Math.random() - 0.5) * 200 + (i * (window.innerWidth / 15))
            }}
            transition={{ 
              duration: 10 + Math.random() * 10, 
              repeat: Infinity, 
              ease: "linear",
              delay: Math.random() * 10
            }}
            className="absolute text-blue-500/40 font-black text-2xl flex flex-col items-center"
          >
            {i % 3 === 0 ? <Hammer size={32} /> : i % 3 === 1 ? <ShieldCheck size={32} /> : "HM"}
          </motion.div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <Suspense fallback={
          <div className="absolute inset-0 flex items-center justify-center bg-black z-[100]">
            <div className="text-white font-mono animate-pulse">LOADING... / 加载中...</div>
          </div>
        }>
          {currentLevel === 1 ? (
            <motion.div key="level-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[60]">
              <Level1 language={language} starReq={t.level1Star} onExit={(delivered) => {
                exitLevel(0, delivered >= 10);
              }} />
            </motion.div>
          ) : currentLevel === 2 ? (
            <motion.div key="level-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[60]">
              <Level4 language={language} starReq={t.level2Star} onExit={(score) => {
                exitLevel(1, score >= 15);
              }} />
            </motion.div>
          ) : currentLevel === 3 ? (
            <motion.div key="level-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[60]">
              <Level3 language={language} starReq={t.level3Star} onExit={(success) => {
                exitLevel(2, success);
              }} />
            </motion.div>
          ) : currentLevel === 4 ? (
            <motion.div key="level-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[60]">
              <Level2 language={language} starReq={t.level4Star} onExit={(success) => {
                exitLevel(3, success);
              }} />
            </motion.div>
          ) : currentLevel === 5 ? (
            <motion.div key="level-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[60]">
              <Level5 language={language} starReq={t.level5Star} onExit={(success) => {
                exitLevel(4, success);
              }} />
            </motion.div>
          ) : currentLevel === 6 ? (
            <motion.div key="level-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[60]">
              <Level6 language={language} starReq={t.level6Star} onExit={(success) => {
                exitLevel(5, success);
              }} />
            </motion.div>
          ) : currentLevel === 7 ? (
            <motion.div key="level-7" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[60]">
              <Level7 language={language} starReq={t.level7Star} onExit={(success) => {
                exitLevel(6, success);
              }} />
            </motion.div>
          ) : !gameStarted ? (
          <motion.div 
            key="start"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center z-50 pointer-events-auto"
            onClick={() => {
              setGameStarted(true);
              soundManager.startBGM();
            }}
          >
            <div className="text-center p-10 max-w-lg">
              <motion.div 
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 3 }}
                className="w-24 h-24 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-10 border border-blue-500/30 shadow-[0_0_50px_rgba(59,130,246,0.2)]"
              >
                <ShieldCheck className="text-blue-500" size={48} />
              </motion.div>
              <h1 className="text-6xl font-black mb-4 tracking-tighter uppercase leading-none">{t.title}</h1>
              <p className="text-blue-400 font-mono tracking-[0.4em] text-sm mb-12 uppercase">{t.subtitle}</p>
              
              <motion.div 
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="text-white/40 font-black tracking-[0.3em] text-lg uppercase"
              >
                {t.anyKey}
              </motion.div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="menu"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute inset-0 flex flex-col items-center justify-center p-6"
          >
            <div className="w-full max-w-4xl">
              <div className="flex justify-between items-end mb-12">
                <div>
                  <h2 className="text-4xl font-black tracking-tight uppercase">{t.selectLevel}</h2>
                  <div className="h-1 w-20 bg-blue-500 mt-4" />
                </div>
                <button 
                  onClick={toggleLanguage}
                  className="bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/10 px-6 py-3 rounded-2xl transition-all flex items-center gap-3 text-sm font-bold uppercase tracking-widest"
                >
                  <Globe size={18} />
                  {t.lang}
                </button>
              </div>

              {/* Star Progress */}
              <div className="mb-8 flex items-center justify-between bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur-md">
                <div className="flex items-center gap-4">
                  <div className="flex gap-2">
                    {stars.map((s, i) => (
                      <motion.div 
                        key={i}
                        initial={false}
                        animate={{ 
                          scale: s ? [1, 1.2, 1] : 1,
                          color: s ? "#fbbf24" : "#333"
                        }}
                        className="text-2xl"
                      >
                        <Target size={24} fill={s ? "currentColor" : "none"} />
                      </motion.div>
                    ))}
                  </div>
                  <p className="text-xs font-black uppercase tracking-widest text-white/40">{t.stars}: {totalStars}/6</p>
                </div>
                
                {allStarsCollected && (
                  <motion.button
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    onClick={() => setShowCertificate(true)}
                    className="bg-yellow-500 text-black px-6 py-2 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-white transition-all shadow-[0_0_20px_rgba(251,191,36,0.3)]"
                  >
                    {t.certificate}
                  </motion.button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Level 1 Card */}
                <motion.div 
                  whileHover={{ scale: 1.02, y: -5 }}
                  onClick={() => setCurrentLevel(1)}
                  className="group relative bg-white/5 hover:bg-white/10 border border-white/10 p-6 rounded-[2rem] cursor-pointer transition-all overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Settings size={80} />
                  </div>
                  <div className="relative z-10">
                    <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-4 border border-blue-500/30">
                      <Settings className="text-blue-500" size={24} />
                    </div>
                    <h3 className="text-lg font-black mb-2 uppercase tracking-tight leading-none">{t.level1Title}</h3>
                    <p className="text-white/50 text-[10px] leading-relaxed mb-6">{t.level1Desc}</p>
                    <div className="flex items-center gap-2 text-blue-400 font-bold text-[10px] uppercase tracking-widest">
                      {t.start} <ArrowRight size={12} />
                    </div>
                  </div>
                </motion.div>

                {/* Level 2 Card */}
                <motion.div 
                  whileHover={{ scale: 1.02, y: -5 }}
                  onClick={() => setCurrentLevel(2)}
                  className="group relative bg-white/5 hover:bg-white/10 border border-white/10 p-6 rounded-[2rem] cursor-pointer transition-all overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                    <RefreshCcw size={80} />
                  </div>
                  <div className="relative z-10">
                    <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center mb-4 border border-orange-500/30">
                      <RefreshCcw className="text-orange-500" size={24} />
                    </div>
                    <h3 className="text-lg font-black mb-2 uppercase tracking-tight leading-none">{t.level2Title}</h3>
                    <p className="text-white/50 text-[10px] leading-relaxed mb-6">{t.level2Desc}</p>
                    <div className="flex items-center gap-2 text-orange-400 font-bold text-[10px] uppercase tracking-widest">
                      {t.start} <ArrowRight size={12} />
                    </div>
                  </div>
                </motion.div>

                {/* Level 3 Card */}
                <motion.div 
                  whileHover={{ scale: 1.02, y: -5 }}
                  onClick={() => setCurrentLevel(3)}
                  className="group relative bg-white/5 hover:bg-white/10 border border-white/10 p-6 rounded-[2rem] cursor-pointer transition-all overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Hammer size={80} />
                  </div>
                  <div className="relative z-10">
                    <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center mb-4 border border-green-500/30">
                      <Hammer className="text-green-500" size={24} />
                    </div>
                    <h3 className="text-lg font-black mb-2 uppercase tracking-tight leading-none">{t.level3Title}</h3>
                    <p className="text-white/50 text-[10px] leading-relaxed mb-6">{t.level3Desc}</p>
                    <div className="flex items-center gap-2 text-green-400 font-bold text-[10px] uppercase tracking-widest">
                      {t.start} <ArrowRight size={12} />
                    </div>
                  </div>
                </motion.div>

                {/* Level 4 Card */}
                <motion.div 
                  whileHover={{ scale: 1.02, y: -5 }}
                  onClick={() => setCurrentLevel(4)}
                  className="group relative bg-white/5 hover:bg-white/10 border border-white/10 p-6 rounded-[2rem] cursor-pointer transition-all overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Activity size={80} />
                  </div>
                  <div className="relative z-10">
                    <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-4 border border-purple-500/30">
                      <Activity className="text-purple-500" size={24} />
                    </div>
                    <h3 className="text-lg font-black mb-2 uppercase tracking-tight leading-none">{t.level4Title}</h3>
                    <p className="text-white/50 text-[10px] leading-relaxed mb-6">{t.level4Desc}</p>
                    <div className="flex items-center gap-2 text-purple-400 font-bold text-[10px] uppercase tracking-widest">
                      {t.start} <ArrowRight size={12} />
                    </div>
                  </div>
                </motion.div>

                {/* Level 5 Card */}
                <motion.div 
                  whileHover={{ scale: 1.02, y: -5 }}
                  onClick={() => setCurrentLevel(5)}
                  className="group relative bg-white/5 hover:bg-white/10 border border-white/10 p-6 rounded-[2rem] cursor-pointer transition-all overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                    <ShieldCheck size={80} />
                  </div>
                  <div className="relative z-10">
                    <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center mb-4 border border-red-500/30">
                      <ShieldCheck className="text-red-500" size={24} />
                    </div>
                    <h3 className="text-lg font-black mb-2 uppercase tracking-tight leading-none">{t.level5Title}</h3>
                    <p className="text-white/50 text-[10px] leading-relaxed mb-6">{t.level5Desc}</p>
                    <div className="flex items-center gap-2 text-red-400 font-bold text-[10px] uppercase tracking-widest">
                      {t.start} <ArrowRight size={12} />
                    </div>
                  </div>
                </motion.div>

                {/* Level 6 Card */}
                <motion.div 
                  whileHover={{ scale: 1.02, y: -5 }}
                  onClick={() => setCurrentLevel(6)}
                  className="group relative bg-white/5 hover:bg-white/10 border border-white/10 p-6 rounded-[2rem] cursor-pointer transition-all overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Target size={80} />
                  </div>
                  <div className="relative z-10">
                    <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center mb-4 border border-cyan-500/30">
                      <Target className="text-cyan-500" size={24} />
                    </div>
                    <h3 className="text-lg font-black mb-2 uppercase tracking-tight leading-none">{t.level6Title}</h3>
                    <p className="text-white/50 text-[10px] leading-relaxed mb-6">{t.level6Desc}</p>
                    <div className="flex items-center gap-2 text-cyan-400 font-bold text-[10px] uppercase tracking-widest">
                      {t.start} <ArrowRight size={12} />
                    </div>
                  </div>
                </motion.div>

                {/* Level 7 Card */}
                <motion.div 
                  whileHover={{ scale: 1.02, y: -5 }}
                  onClick={() => setCurrentLevel(7)}
                  className="group relative bg-white/5 hover:bg-white/10 border border-white/10 p-6 rounded-[2rem] cursor-pointer transition-all overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Hammer size={80} />
                  </div>
                  <div className="relative z-10">
                    <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center mb-4 border border-orange-500/30">
                      <Hammer className="text-orange-500" size={24} />
                    </div>
                    <h3 className="text-lg font-black mb-2 uppercase tracking-tight leading-none">{t.level7Title}</h3>
                    <p className="text-white/50 text-[10px] leading-relaxed mb-6">{t.level7Desc}</p>
                    <div className="flex items-center gap-2 text-orange-400 font-bold text-[10px] uppercase tracking-widest">
                      {t.start} <ArrowRight size={12} />
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </Suspense>
    </AnimatePresence>

      {/* Certificate Modal */}
      <AnimatePresence>
        {showCertificate && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/95 backdrop-blur-xl z-[100] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-2xl bg-white text-black p-12 rounded-[2rem] shadow-2xl relative overflow-hidden text-center"
            >
              {/* Cert Border Decor */}
              <div className="absolute inset-4 border-4 border-blue-600/20 pointer-events-none" />
              <div className="absolute inset-6 border border-blue-600/10 pointer-events-none" />
              
              <ShieldCheck size={64} className="text-blue-600 mx-auto mb-4" />
              <h2 className="text-4xl font-black tracking-tighter uppercase mb-2">
                {language === 'zh' ? '培训结业证书' : 'CERTIFICATE OF COMPLETION'}
              </h2>
              <p className="text-blue-600 font-mono text-xs mb-8 tracking-[0.3em] uppercase">
                Hotmeer Empowerment Department / Hotmeer 赋能部
              </p>
              <div className="h-1 w-20 bg-blue-600 mx-auto mb-8" />
              
              <div className="text-gray-500 font-serif italic mb-10 px-10 space-y-2">
                <p>"{t.certDescEn}"</p>
                <p className="text-sm">"{t.certDescZh}"</p>
              </div>
              
              <div className="mb-12">
                <input 
                  type="text" 
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder={t.enterName}
                  className="w-full max-w-sm bg-gray-100 border-b-2 border-blue-600 px-4 py-3 text-2xl font-black text-center focus:outline-none placeholder:text-gray-300"
                />
              </div>
              
              <div className="flex flex-col gap-4 items-center">
                <button 
                  onClick={handleDownloadCert}
                  className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl"
                >
                  {t.download}
                </button>
                <button 
                  onClick={() => setShowCertificate(false)}
                  className="text-gray-400 font-bold text-xs uppercase hover:text-black"
                >
                  {t.back}
                </button>
              </div>
              
              <div className="mt-12 pt-8 border-t border-gray-100 flex justify-between items-center text-[10px] font-mono text-gray-400 uppercase tracking-widest">
                <span>Hotmeer Training OS v3.1</span>
                <span>{new Date().toLocaleDateString()}</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Version Info */}
      <div className="absolute bottom-10 left-10 text-[10px] font-mono text-white/20 uppercase tracking-[0.5em]">
        Hotmeer Training OS v3.1 // Build 2026.04.11
      </div>
    </div>
  );
}

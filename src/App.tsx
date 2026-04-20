import { useState, useEffect, Suspense } from 'react';
import { ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { soundManager } from './lib/sounds';
import { Level7 } from './levels/Level7';
import { Language } from './types';

export default function App() {
  const [language] = useState<Language>('zh');
  const [gameStarted, setGameStarted] = useState(false);

  useEffect(() => {
    const resumeAudio = () => {
      soundManager.playTone(0, 'sine', 0.01, 0);
    };
    window.addEventListener('click', resumeAudio);
    return () => window.removeEventListener('click', resumeAudio);
  }, []);

  const t = {
    en: {
      title: "Hotmeer O&M Training",
      subtitle: "Professional Logistics Simulation",
      anyKey: "CLICK TO START",
      level7Star: "Repair 3 AGVs successfully",
    },
    zh: {
      title: "Hotmeer运维培训软件",
      subtitle: "专业物流仿真系统",
      anyKey: "点击屏幕开始",
      level7Star: "成功维修3台机器人",
    }
  }[language];

  return (
    <div className="w-full h-screen bg-[#050505] text-white font-sans overflow-hidden relative">
      <AnimatePresence mode="wait">
        <Suspense fallback={
          <div className="absolute inset-0 flex items-center justify-center bg-black z-[100]">
            <div className="text-white font-mono animate-pulse">LOADING... / 加载中...</div>
          </div>
        }>
          {!gameStarted ? (
            <motion.div 
              key="start"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center z-50 pointer-events-auto cursor-pointer"
              onClick={() => {
                setGameStarted(true);
                soundManager.startBGM();
              }}
            >
              <div className="text-center p-10 max-w-lg">
                <motion.div 
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ repeat: Infinity, duration: 3 }}
                  className="w-24 h-24 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-10 border border-blue-500/30"
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
            <motion.div key="level-7" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[60]">
              <Level7 language={language} starReq={t.level7Star} onExit={() => setGameStarted(false)} />
            </motion.div>
          )}
        </Suspense>
      </AnimatePresence>
    </div>
  );
}

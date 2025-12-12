import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
}

const BlueBackground = () => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < 15; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 2,
        duration: Math.random() * 20 + 25,
        delay: Math.random() * 10,
      });
    }
    setParticles(newParticles);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ backgroundColor: '#0B1C3A' }}>
      {/* Animated Waves Container */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Wave 1 - Bottom */}
        <motion.div
          className="absolute w-[200%] h-[300px] left-[-50%]"
          style={{
            bottom: '-50px',
            background: 'linear-gradient(180deg, transparent 0%, rgba(30, 79, 163, 0.08) 100%)',
            borderRadius: '50% 50% 0 0',
          }}
          animate={{
            x: [0, -100, 0],
            scaleY: [1, 1.1, 1],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        
        {/* Wave 2 - Bottom offset */}
        <motion.div
          className="absolute w-[200%] h-[250px] left-[-50%]"
          style={{
            bottom: '-30px',
            background: 'linear-gradient(180deg, transparent 0%, rgba(30, 79, 163, 0.05) 100%)',
            borderRadius: '50% 50% 0 0',
          }}
          animate={{
            x: [-80, 20, -80],
            scaleY: [1.05, 0.95, 1.05],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 1,
          }}
        />

        {/* Wave 3 - Middle decorative */}
        <motion.div
          className="absolute w-[150%] h-[2px] left-[-25%]"
          style={{
            top: '60%',
            background: 'linear-gradient(90deg, transparent, rgba(30, 79, 163, 0.15), transparent)',
          }}
          animate={{
            x: [-100, 100, -100],
            opacity: [0.3, 0.6, 0.3],
            scaleX: [0.8, 1.2, 0.8],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Wave 4 - Top decorative line */}
        <motion.div
          className="absolute w-[150%] h-[1px] left-[-25%]"
          style={{
            top: '30%',
            background: 'linear-gradient(90deg, transparent, rgba(42, 63, 134, 0.12), transparent)',
          }}
          animate={{
            x: [50, -150, 50],
            opacity: [0.2, 0.5, 0.2],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 2,
          }}
        />

        {/* Flowing wave SVG paths */}
        <svg 
          className="absolute inset-0 w-full h-full"
          preserveAspectRatio="none"
          viewBox="0 0 1440 800"
        >
          {/* Wave path 1 */}
          <motion.path
            d="M0,400 C360,300 720,500 1080,400 C1260,350 1440,450 1440,450 L1440,800 L0,800 Z"
            fill="rgba(30, 79, 163, 0.04)"
            animate={{
              d: [
                "M0,400 C360,300 720,500 1080,400 C1260,350 1440,450 1440,450 L1440,800 L0,800 Z",
                "M0,450 C360,350 720,450 1080,350 C1260,400 1440,400 1440,400 L1440,800 L0,800 Z",
                "M0,400 C360,300 720,500 1080,400 C1260,350 1440,450 1440,450 L1440,800 L0,800 Z",
              ],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          
          {/* Wave path 2 */}
          <motion.path
            d="M0,500 C240,450 480,550 720,500 C960,450 1200,550 1440,500 L1440,800 L0,800 Z"
            fill="rgba(42, 63, 134, 0.03)"
            animate={{
              d: [
                "M0,500 C240,450 480,550 720,500 C960,450 1200,550 1440,500 L1440,800 L0,800 Z",
                "M0,520 C240,480 480,520 720,480 C960,520 1200,480 1440,520 L1440,800 L0,800 Z",
                "M0,500 C240,450 480,550 720,500 C960,450 1200,550 1440,500 L1440,800 L0,800 Z",
              ],
            }}
            transition={{
              duration: 12,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 1,
            }}
          />

          {/* Wave path 3 - subtle top wave */}
          <motion.path
            d="M0,200 C180,180 360,220 540,200 C720,180 900,220 1080,200 C1260,180 1440,210 1440,210 L1440,0 L0,0 Z"
            fill="rgba(30, 79, 163, 0.025)"
            animate={{
              d: [
                "M0,200 C180,180 360,220 540,200 C720,180 900,220 1080,200 C1260,180 1440,210 1440,210 L1440,0 L0,0 Z",
                "M0,210 C180,230 360,190 540,210 C720,230 900,190 1080,210 C1260,230 1440,200 1440,200 L1440,0 L0,0 Z",
                "M0,200 C180,180 360,220 540,200 C720,180 900,220 1080,200 C1260,180 1440,210 1440,210 L1440,0 L0,0 Z",
              ],
            }}
            transition={{
              duration: 18,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 3,
            }}
          />
        </svg>
      </div>

      {/* Ambient glow spots */}
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(30, 79, 163, 0.1) 0%, transparent 60%)',
          top: '-10%',
          right: '-5%',
          filter: 'blur(60px)',
        }}
        animate={{
          scale: [1, 1.08, 1],
          opacity: [0.4, 0.6, 0.4],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(42, 63, 134, 0.08) 0%, transparent 60%)',
          bottom: '-10%',
          left: '-5%',
          filter: 'blur(60px)',
        }}
        animate={{
          scale: [1.05, 1, 1.05],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 3,
        }}
      />

      {/* Floating particles */}
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size,
            backgroundColor: 'rgba(30, 79, 163, 0.2)',
          }}
          animate={{
            y: [0, -25, 0, 20, 0],
            x: [0, 12, -8, 5, 0],
            opacity: [0.15, 0.3, 0.15],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.012]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(30, 79, 163, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(30, 79, 163, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
        }}
      />

      {/* Noise texture */}
      <div className="noise-overlay" />

      {/* Vignette */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, transparent 0%, rgba(11, 28, 58, 0.4) 100%)',
        }}
      />
    </div>
  );
};

export default BlueBackground;
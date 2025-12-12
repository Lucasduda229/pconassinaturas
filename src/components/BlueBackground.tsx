import { motion } from 'framer-motion';
import { useMemo } from 'react';

interface MagneticOrb {
  id: number;
  size: number;
  initialX: number;
  initialY: number;
  duration: number;
  delay: number;
}

const BlueBackground = () => {
  // Generate magnetic orbs with random positions and movement patterns
  const magneticOrbs = useMemo<MagneticOrb[]>(() => {
    const orbs: MagneticOrb[] = [];
    for (let i = 0; i < 6; i++) {
      orbs.push({
        id: i,
        size: 300 + Math.random() * 400,
        initialX: Math.random() * 100,
        initialY: Math.random() * 100,
        duration: 18 + Math.random() * 12,
        delay: Math.random() * 5,
      });
    }
    return orbs;
  }, []);

  // Generate random movement paths for each orb
  const getOrbAnimation = (orb: MagneticOrb) => {
    const xRange = 30 + Math.random() * 20;
    const yRange = 25 + Math.random() * 20;
    return {
      x: [
        `${orb.initialX}%`,
        `${orb.initialX + xRange}%`,
        `${orb.initialX - xRange / 2}%`,
        `${orb.initialX + xRange / 3}%`,
        `${orb.initialX}%`,
      ],
      y: [
        `${orb.initialY}%`,
        `${orb.initialY - yRange}%`,
        `${orb.initialY + yRange / 2}%`,
        `${orb.initialY - yRange / 3}%`,
        `${orb.initialY}%`,
      ],
      scale: [1, 1.15, 0.9, 1.1, 1],
    };
  };

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ backgroundColor: '#0B1C3A' }}>
      {/* Animated gradient base layer */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(120deg, #002c5d 0%, #004b8d 50%, #0B1C3A 100%)',
          backgroundSize: '400% 400%',
        }}
        animate={{
          backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Magnetic Orbs - The main "wave" effect */}
      {magneticOrbs.map((orb) => (
        <motion.div
          key={orb.id}
          className="absolute rounded-full"
          style={{
            width: orb.size,
            height: orb.size,
            left: 0,
            top: 0,
            background: `radial-gradient(circle, rgba(30, 79, 163, 0.15) 0%, rgba(30, 79, 163, 0.05) 40%, transparent 70%)`,
            filter: 'blur(40px)',
          }}
          initial={{
            x: `${orb.initialX}%`,
            y: `${orb.initialY}%`,
          }}
          animate={getOrbAnimation(orb)}
          transition={{
            duration: orb.duration,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: orb.delay,
          }}
        />
      ))}

      {/* Secondary smaller orbs for depth */}
      {[...Array(4)].map((_, i) => (
        <motion.div
          key={`secondary-${i}`}
          className="absolute rounded-full"
          style={{
            width: 150 + i * 50,
            height: 150 + i * 50,
            background: 'radial-gradient(circle, rgba(255, 255, 255, 0.08) 0%, transparent 60%)',
            filter: 'blur(30px)',
          }}
          initial={{
            x: `${20 + i * 20}%`,
            y: `${30 + i * 15}%`,
          }}
          animate={{
            x: [`${20 + i * 20}%`, `${40 + i * 15}%`, `${10 + i * 25}%`, `${20 + i * 20}%`],
            y: [`${30 + i * 15}%`, `${50 + i * 10}%`, `${20 + i * 20}%`, `${30 + i * 15}%`],
            opacity: [0.4, 0.7, 0.5, 0.4],
          }}
          transition={{
            duration: 15 + i * 3,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 2,
          }}
        />
      ))}

      {/* Flowing wave lines - subtle horizontal movement */}
      <svg 
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="none"
        viewBox="0 0 1440 800"
        style={{ opacity: 0.3 }}
      >
        <motion.path
          d="M-100,400 Q200,350 400,400 T800,380 T1200,400 T1600,380"
          stroke="rgba(30, 79, 163, 0.3)"
          strokeWidth="1"
          fill="none"
          animate={{
            d: [
              "M-100,400 Q200,350 400,400 T800,380 T1200,400 T1600,380",
              "M-100,380 Q200,420 400,380 T800,400 T1200,380 T1600,400",
              "M-100,400 Q200,350 400,400 T800,380 T1200,400 T1600,380",
            ],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.path
          d="M-100,500 Q300,450 500,500 T900,480 T1300,500 T1700,480"
          stroke="rgba(42, 63, 134, 0.25)"
          strokeWidth="1"
          fill="none"
          animate={{
            d: [
              "M-100,500 Q300,450 500,500 T900,480 T1300,500 T1700,480",
              "M-100,480 Q300,520 500,480 T900,500 T1300,480 T1700,500",
              "M-100,500 Q300,450 500,500 T900,480 T1300,500 T1700,480",
            ],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 1,
          }}
        />
        <motion.path
          d="M-100,300 Q250,280 450,300 T850,280 T1250,300 T1650,280"
          stroke="rgba(30, 79, 163, 0.2)"
          strokeWidth="0.5"
          fill="none"
          animate={{
            d: [
              "M-100,300 Q250,280 450,300 T850,280 T1250,300 T1650,280",
              "M-100,280 Q250,320 450,280 T850,300 T1250,280 T1650,300",
              "M-100,300 Q250,280 450,300 T850,280 T1250,300 T1650,280",
            ],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 2,
          }}
        />
      </svg>

      {/* Corner ambient glows */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 500,
          height: 500,
          background: 'radial-gradient(circle, rgba(30, 79, 163, 0.15) 0%, transparent 60%)',
          top: '-15%',
          right: '-10%',
          filter: 'blur(60px)',
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.5, 0.7, 0.5],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      <motion.div
        className="absolute rounded-full"
        style={{
          width: 400,
          height: 400,
          background: 'radial-gradient(circle, rgba(42, 63, 134, 0.12) 0%, transparent 60%)',
          bottom: '-10%',
          left: '-8%',
          filter: 'blur(50px)',
        }}
        animate={{
          scale: [1.1, 1, 1.1],
          opacity: [0.4, 0.6, 0.4],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 3,
        }}
      />

      {/* Vignette overlay */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, transparent 0%, rgba(11, 28, 58, 0.5) 100%)',
        }}
      />
    </div>
  );
};

export default BlueBackground;

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface Particle {
  id: number;
  x: number;
  size: number;
  duration: number;
  delay: number;
  brightness: number;
}

const AnimatedBackground = () => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < 25; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 100,
        size: Math.random() * 3 + 1,
        duration: Math.random() * 25 + 20,
        delay: Math.random() * 25,
        brightness: Math.random() * 0.4 + 0.4,
      });
    }
    setParticles(newParticles);
  }, []);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Base gradient */}
      <div className="absolute inset-0 futuristic-bg" />

      {/* Mesh gradients */}
      <div className="mesh-gradient mesh-gradient-1" />
      <div className="mesh-gradient mesh-gradient-2" />
      <div className="mesh-gradient mesh-gradient-3" />

      {/* Aurora effect */}
      <div className="aurora-effect" />

      {/* Animated glow */}
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full blur-[80px] pointer-events-none"
        style={{
          background: 'radial-gradient(circle, hsl(220 70% 55% / 0.25), transparent 60%)',
          top: '15%',
          right: '10%',
        }}
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      <motion.div
        className="absolute w-[400px] h-[400px] rounded-full blur-[80px] pointer-events-none"
        style={{
          background: 'radial-gradient(circle, hsl(280 75% 45% / 0.2), transparent 60%)',
          bottom: '10%',
          left: '15%',
        }}
        animate={{
          scale: [1.1, 1, 1.1],
          opacity: [0.25, 0.45, 0.25],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 3,
        }}
      />

      {/* Particles */}
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            left: `${particle.x}%`,
            width: particle.size,
            height: particle.size,
            background: `linear-gradient(135deg, 
              hsl(220 70% 70% / ${particle.brightness}), 
              hsl(280 75% 60% / ${particle.brightness * 0.7})
            )`,
            boxShadow: `0 0 ${particle.size * 2}px hsl(220 70% 60% / 0.3)`,
          }}
          initial={{ y: '105vh', opacity: 0 }}
          animate={{
            y: '-5vh',
            opacity: [0, particle.brightness, particle.brightness, 0],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
            ease: 'linear',
          }}
        />
      ))}

      {/* Grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `
            linear-gradient(hsl(220 70% 60% / 0.25) 1px, transparent 1px),
            linear-gradient(90deg, hsl(220 70% 60% / 0.25) 1px, transparent 1px)
          `,
          backgroundSize: '70px 70px',
        }}
      />
      
      {/* Radial vignette */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, transparent 0%, hsl(var(--background)) 75%)',
        }}
      />
    </div>
  );
};

export default AnimatedBackground;
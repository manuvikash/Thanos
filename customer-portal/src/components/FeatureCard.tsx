import React from 'react';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description }) => {
  return (
    <div className="flex flex-col gap-4 p-6 border-l border-neutral-800">
      <div className="w-10 h-10 flex items-center justify-center rounded-full bg-neutral-800/50">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-neutral-100 font-mono-custom">
        {title}
      </h3>
      <p className="text-neutral-400">{description}</p>
    </div>
  );
};

export default FeatureCard;

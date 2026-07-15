import { useEffect, useRef } from 'react';

interface AdBannerProps {
  className?: string;
  dataAdSlot?: string;
  dataAdFormat?: 'auto' | 'fluid' | 'rectangle';
}

export function AdBanner({ className = '', dataAdSlot = '1234567890', dataAdFormat = 'auto' }: AdBannerProps) {
  const adRef = useRef<boolean>(false);

  useEffect(() => {
    // Only push if not already pushed (React StrictMode workaround)
    try {
      if (!adRef.current && typeof window !== 'undefined') {
        const adsbygoogle = (window as any).adsbygoogle || [];
        adsbygoogle.push({});
        adRef.current = true;
      }
    } catch (e) {
      console.error('Google Adsense error:', e);
    }
  }, []);

  return (
    <div className={`w-full flex justify-center my-4 ${className}`}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block', width: '100%', minHeight: '90px', backgroundColor: 'rgba(0,0,0,0.2)' }}
        data-ad-client="ca-pub-0000000000000000" /* REPLACE WITH YOUR ADSENSE PUBLISHER ID */
        data-ad-slot={dataAdSlot} /* REPLACE WITH YOUR AD SLOT ID */
        data-ad-format={dataAdFormat}
        data-full-width-responsive="true"
      />
    </div>
  );
}

"use client";

export interface ShareButtonProps {
  url: string;
  text: string;
}

export function ShareButton(props: ShareButtonProps) {
  const { url, text } = props;
  const handleShare = () => {
    const { navigator } = window;
    if (navigator?.share) {
      navigator.share({ title: "Farguessr by ds8", text });
    } else if (navigator?.clipboard) {
      navigator.clipboard.writeText(url);
      alert("Copied to clipboard");
    } else {
      alert("Sharing is not supported on this device!");
    }
  };

  return (
    <button
      className="bg-slate-700 w-full px-6 py-4 text-white font-inter font-bold rounded hover:bg-slate-800 active:bg-slate-900 transition-colors duration-300 ease-in-out"
      onClick={handleShare}
    >
      Share
    </button>
  );
}

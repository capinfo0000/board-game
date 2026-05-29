import React, { useEffect, useRef } from 'react';

export default function LogPanel({ log }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [log]);
  const recent = log.slice(-30);
  return (
    <div className="log-panel" ref={ref}>
      {recent.map((e) => (
        <div className="entry" key={e.id}>
          {e.text}
        </div>
      ))}
    </div>
  );
}

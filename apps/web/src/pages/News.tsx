import { useEffect, useState } from 'react';
import { useTenant } from '@loyalink/theme';
import { fetchNews, type NewsItem } from '@loyalink/sdk';

export default function News() {
  const tenant = useTenant();
  const [news, setNews] = useState<NewsItem[]>([]);

  useEffect(() => {
    fetchNews(tenant.id).then(setNews);
  }, [tenant.id]);

  return (
    <>
      <h3>News</h3>
      {news.length === 0 && <p className="muted">No news yet.</p>}
      {news.map((n) => (
        <div className="card" key={n.id}>
          {n.image_url && (
            <img src={n.image_url} alt="" style={{ width: '100%', borderRadius: 'var(--radius)', marginBottom: 10 }} />
          )}
          <strong>{n.title}</strong>
          {n.body && <p className="muted" style={{ fontSize: 14 }}>{n.body}</p>}
          <span className="muted" style={{ fontSize: 12 }}>{new Date(n.created_at).toLocaleDateString()}</span>
        </div>
      ))}
    </>
  );
}

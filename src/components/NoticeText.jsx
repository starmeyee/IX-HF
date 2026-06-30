import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { whatsappToMarkdown } from '../utils/whatsappFormat';

/**
 * Renders notice body authored in WhatsApp syntax by converting it to
 * Markdown for react-markdown. Use everywhere a notice body is displayed.
 * remark-gfm enables strikethrough (~~text~~), tables, etc.
 */
export default function NoticeText({ children }) {
  return (
    <div className="markdown-content">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {whatsappToMarkdown(children || '')}
      </ReactMarkdown>
    </div>
  );
}

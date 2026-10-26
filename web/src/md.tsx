export function Md({ text }: { text: string }) {
  return <>{text.split('\n\n').map((para, i) => (
    <p key={i}>{para.split(/(\*\*[^*]+\*\*)/).map((s, j) => s.startsWith('**') ? <b key={j}>{s.slice(2, -2)}</b> : s)}</p>
  ))}</>
}

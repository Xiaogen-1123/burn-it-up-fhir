#!/usr/bin/env python3
import sys
from pathlib import Path
import markdown

def main():
    md_path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('patient.md')
    out_dir = Path(sys.argv[2]) if len(sys.argv) > 2 else Path('_preview')
    if not md_path.exists():
        print(f"Error: markdown file not found: {md_path}")
        raise SystemExit(1)
    out_dir.mkdir(parents=True, exist_ok=True)
    md_text = md_path.read_text(encoding='utf-8')
    html_body = markdown.markdown(md_text, extensions=['fenced_code', 'tables'])
    title = md_path.stem
    page = f"""<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{title} - Preview</title>
  <style>
    body {{ font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Noto Sans TC', 'PingFang TC', 'Microsoft JhengHei', sans-serif; max-width: 900px; margin: 2rem auto; padding: 0 1rem; line-height:1.6; }}
    pre {{ background:#f6f8fa; padding:0.8rem; overflow:auto }}
    code {{ background:#f6f8fa; padding:0.2rem 0.4rem; border-radius:4px }}
    h1,h2,h3 {{ margin-top:1.2rem }}
  </style>
</head>
<body>
<article>
{html_body}
</article>
</body>
</html>"""
    out_file = out_dir / f"{title}.html"
    out_file.write_text(page, encoding='utf-8')
    # simple index
    index = out_dir / 'index.html'
    if not index.exists():
        index.write_text(f"<meta charset=\"utf-8\"><title>Preview index</title><ul><li><a href=\"{out_file.name}\">{out_file.name}</a></li></ul>", encoding='utf-8')
    print(f"Wrote {out_file}")

if __name__ == '__main__':
    main()

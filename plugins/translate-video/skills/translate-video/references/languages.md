# Language Codes

| Code | Language | RTL? |
|------|----------|------|
| `he` | Hebrew | Yes |
| `ar` | Arabic | Yes |
| `fa` | Farsi | Yes |
| `en` | English | No |
| `es` | Spanish | No |
| `fr` | French | No |
| `de` | German | No |
| `ru` | Russian | No |
| `zh` | Chinese | No |
| `ja` | Japanese | No |
| `pt` | Portuguese | No |
| `it` | Italian | No |
| `tr` | Turkish | No |
| `nl` | Dutch | No |
| `pl` | Polish | No |
| `ko` | Korean | No |

## RTL Languages

For Hebrew (`he`), Arabic (`ar`), and Farsi (`fa`), run `rtl-fix.py` after `postprocess.py`:

```bash
python3 ~/.claude/skills/translate-video/scripts/rtl-fix.py "$SRT"
```

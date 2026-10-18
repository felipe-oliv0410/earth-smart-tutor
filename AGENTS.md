<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep accessibility settings in one browser-side hook and menu; apply typography globally and migrate the legacy contrast preference to preserve returning visitors' choices.
- Change AI speech speed by instructing the TTS model (not playbackRate), so the voice pitch stays natural.
- Keep tutor prompts in a server-only shared module so text and live voice use the same pedagogical rules.
- Live voice uses the shared persistent relay with SDK client delegation and a mounted browser hook/audio element; preserve heartbeat, immediate Stop, final usage draining, and same-origin validation to prevent orphaned paid calls.

package util

import (
	"fmt"
	"testing"
)

// A Telegram anchor and its visible URL must produce one complete share link.
func TestCommunityXunleiShareID(t *testing.T) {
	for _, id := range []string{"VPabc123", "VP-abc_def-A1", "VP_abc-def"} {
		for _, suffix := range []string{"", "?pwd=tnjx", "?pwd=tnjx#"} {
			full := "https://pan.xunlei.com/s/" + id + suffix
			t.Run(id+suffix, func(t *testing.T) {
				if got := XunleiPanPattern.FindString(full); got != full {
					t.Fatalf("complete URL lost: got %q, want %q", got, full)
				}
				html := fmt.Sprintf(`<div class="tgme_widget_message_wrap"><div class="tgme_widget_message" data-post="test/1"><a class="tgme_widget_message_date"><time datetime="2026-10-24T00:00:00Z"></time></a><div class="tgme_widget_message_text">测试资源<br/><a href="%s">%s</a></div></div></div>`, full, full)
				rows, _, err := ParseSearchResults(html, "test")
				if err != nil || len(rows) != 1 {
					t.Fatalf("expected one parsed message, got %d, error %v", len(rows), err)
				}
				if len(rows[0].Links) != 1 || rows[0].Links[0].URL != full {
					t.Fatalf("expected one complete link %q, got %+v", full, rows[0].Links)
				}
			})
		}
	}
}

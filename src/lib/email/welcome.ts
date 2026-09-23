import { SITE_URL } from "@/lib/site-url";

/**
 * The welcome email sent once, when someone first subscribes.
 *
 * Edit the copy here. It is rendered through renderEmail(), so it inherits the
 * site's dark palette, header and unsubscribe footer automatically: the body
 * below is plain markdown and needs no styling of its own.
 */
export function welcomeEmail() {
  return {
    subject: "you're on the list",
    preheader: "new music, early. thanks for signing up.",
    bodyMd: [
      "# you're in.",
      "",
      "Thanks for signing up. You'll hear it here first: new songs, release dates, and shows once they're booked.",
      "",
      "I don't send many of these, and your address stays with me.",
      "",
      'The next single, "stay", is coming soon.',
      "",
      `[noahill.com](${SITE_URL})  ·  [press kit](${SITE_URL}/epk)`,
    ].join("\n"),
  };
}

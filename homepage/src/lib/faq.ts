// FAQ content, shared by the FAQ section and the FAQPage schema. Every answer is checked against the code.
export const FAQ = [
  {
    q: "Is CodeCity free?",
    a: "Yes. CodeCity is free and open source under the MIT License. You can read the code, build it yourself and use it at work.",
  },
  {
    q: "Does my code leave my computer?",
    a: "No. CodeCity downloads the repository to your machine and analyzes it there. The app has no analytics. It talks to GitHub only to download repositories, list yours if you connect an account, and check for updates.",
  },
  {
    q: "Which languages does it understand?",
    a: "It parses more than 40 languages with real grammars, including TypeScript, JavaScript, Python, Rust, Go, Java, C, C++, C#, Ruby, PHP, Swift, Kotlin, Scala, Dart and Zig.",
  },
  {
    q: "Can I analyze private repositories?",
    a: "Yes. Connect GitHub from the sidebar and your private repositories appear in the list. The access token is stored in the app on your computer. You can also pick a folder on your disk instead.",
  },
  {
    q: "What do height, width and color mean?",
    a: "Height is lines of code and width is the number of functions. Color shows the folder a file belongs to, or the mode you pick: dependencies, complexity, unused exports, file size or type definitions.",
  },
  {
    q: "How large a repository can it open?",
    a: "Large repositories load folder by folder, so you can start exploring while the rest of the city appears.",
  },
  {
    q: "Can I use it from the terminal or with an AI agent?",
    a: "Yes. The repository includes a command line tool that writes a JSON snapshot of any folder, and an MCP server that lets agents ask for hubs, entry points, callers, callees and paths between files.",
  },
  {
    q: "Which platforms are supported?",
    a: "macOS on Apple silicon and Intel, Windows 64 bit, and Linux as an AppImage, deb or rpm package.",
  },
  {
    q: "How do updates work?",
    a: "The app checks GitHub Releases for new versions. When one is available, an update button appears in the sidebar, and the download is verified against a signing key before it installs.",
  },
] as const

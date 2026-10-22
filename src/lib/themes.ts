export type Theme = { key: string; label: string; emoji: string; re: RegExp };
export const THEMES: Theme[] = [
  { key: "ai", label: "AI / Agents", emoji: "🤖", re: /\b(ai|agent|agents|gpt|llm|neural|bot|robot|crawl\w*|model|intelligen\w*|claude|grok|openai|agi)\b/i },
  { key: "rwa", label: "RWA / Oil / Dividends", emoji: "🛢️", re: /\b(rwa|oil|crude|dividend\w*|uso|barrel|treasury|gold|stock\w*|yield|real.?world|petro\w*)\b/i },
  { key: "devfee", label: "Dev fee / Open-source", emoji: "🧑‍💻", re: /\b(open.?source|github|developer|devs?|php|patch\w*|code|repo|fees? to|creator fee|oss)\b/i },
  { key: "pokemon", label: "Pokémon-style", emoji: "⚡", re: /\b(poke\w*|pikachu|pika|charizard|mew\w*|eevee|snorlax|gengar|squirtle|bulba\w*|trainer|pokeball)\b/i },
  { key: "animals", label: "Animals", emoji: "🐸", re: /\b(dog|doge|inu|shib\w*|cat|kitty|frog|pepe|penguin|monkey|ape|bear|bull|fox|hamster|duck|wif|bird|fish|whale|rat|mouse|goat|horse|pig|cow|lion|tiger|panda|waddles)\b/i },
  { key: "politics", label: "Politics / News", emoji: "🗳️", re: /\b(trump|elon|musk|biden|president|election|maga|government|war|news|fed|tariff)\b/i },
  { key: "tools", label: "Trading tools / Utility", emoji: "🛠️", re: /\b(tool|app|trading|terminal|scanner|analytics|sniper|wallet|dex|swap|bridge|platform|protocol|utility|dapp)\b/i },
  { key: "culture", label: "Memes / Culture", emoji: "😂", re: /\b(meme|lol|based|chad|wojak|fart\w*|moon|degen|gm|vibe\w*|cult|kek)\b/i },
];

export function classify(text: string): string[] {
  const hits = THEMES.filter((t) => t.re.test(text)).map((t) => t.key);
  return hits.length ? hits : ["other"];
}

import { LiveChannel } from '../types';

export interface EPGProgram {
    title: string;
    description: string;
    startTime: Date;
    endTime: Date;
    duration: number; // in minutes
    genre: string;
}

// Simple LCG (Linear Congruential Generator) for deterministic seeding
class SeededRandom {
    private seed: number;

    constructor(seed: number) {
        this.seed = seed;
    }

    next(): number {
        this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
        return this.seed / 4294967296;
    }

    choice<T>(arr: T[]): T {
        return arr[Math.floor(this.next() * arr.length)];
    }

    range(min: number, max: number): number {
        return min + Math.floor(this.next() * (max - min));
    }
}

// Get a hash seed from channel ID + Day of year
function getChannelDaySeed(channelId: string, date: Date): number {
    const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);
    const combinedStr = `${channelId}-${date.getFullYear()}-${dayOfYear}`;
    
    let hash = 0;
    for (let i = 0; i < combinedStr.length; i++) {
        hash = (hash << 5) - hash + combinedStr.charCodeAt(i);
        hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash);
}

// Data sources for programs based on normalized categories
const PROGRAM_DATABASE: Record<string, { titles: string[]; descriptions: string[]; genres: string[] }> = {
    news: {
        titles: [
            "Global News Hour", "Morning Briefing", "Prime Time Debate", 
            "Business Today", "World Report", "Documentary Special", 
            "Press Conference Live", "Tech & Science Weekly", "Nightly Digest",
            "Market Watch", "European Report", "Asia-Pacific Digest"
        ],
        descriptions: [
            "In-depth analysis of the day's biggest stories from around the globe, with live reporting, analyst panels, and breaking updates.",
            "Start your day with the essential headlines, weather forecasts, and finance snapshots from around the world.",
            "Our panel of experts and politicians debate the most critical political issues impacting our lives today.",
            "A comprehensive look at global markets, tech start-ups, corporate merges, and economic trends.",
            "Focusing on international affairs, human interest stories, and investigative reporting from our global correspondents.",
            "An award-winning documentary exploring pressing socio-economic or environmental issues facing the globe.",
            "Live coverage of the government press briefing, followed by instant analysis from our senior political editor.",
            "Exploring the latest advancements in AI, biotechnology, green energy, and exploration.",
            "A summary of today's key updates, domestic events, and international news to close the day."
        ],
        genres: ["News", "Current Affairs", "Politics", "Business", "Technology"]
    },
    movies: {
        titles: [
            "Casablanca (Classic)", "The Cyber Matrix", "Interstellar Voyage", 
            "Lover's Lane", "Shutter Island Mystery", "Hollywood Blockbuster", 
            "Indie Film Spotlight", "Midnight Horror: The Awakening", "The Crime Syndicate",
            "Animated Odyssey", "Laughter Therapy: Stand Up", "The Wild Frontier"
        ],
        descriptions: [
            "A legendary story of love, sacrifice, and political intrigue in war-torn Morocco. Winner of multiple Academy Awards.",
            "A hacker discovers the world is a simulated reality and joins a rebellion to free humanity from sentient machines.",
            "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival on a new planet.",
            "An endearing romantic comedy about two rivals in a publishing company who accidentally fall in love.",
            "A US Marshal investigates the disappearance of a murderer who escaped from a hospital for the criminally insane.",
            "An action-packed blockbuster featuring high-speed chases, explosive combat, and state-of-the-art visual effects.",
            "A thought-provoking independent film exploring family relationships and personal growth in rural America.",
            "A group of researchers in an isolated Arctic station discover a dormant ancient force that begins to hunt them.",
            "An intense crime thriller about a detective trying to dismantle a highly organized bank robbery syndicate from within."
        ],
        genres: ["Drama", "Action", "Sci-Fi", "Romance", "Thriller", "Horror", "Comedy"]
    },
    sports: {
        titles: [
            "Premier League Matchday", "NBA Classic Battles", "SportsCenter Live", 
            "Wimbledon Classics", "Formula 1: Grid Talk", "Extreme Sports Weekly", 
            "UEFA Champions League Analysis", "Golf Tour Highlights", "MMA Fight Night",
            "Sports History: Legends", "Olympic Special", "Gridiron Highlights"
        ],
        descriptions: [
            "Live coverage and expert commentary of today's top-flight football matchup, featuring post-game reviews and tactics analysis.",
            "Revisiting one of the most intense and historic basketball showdowns in championship history, with remastered footage.",
            "The definitive daily source for sports news, highlights, scores, analysis, and exclusive player interviews.",
            "Relive the dramatic moments from past grass-court tennis finals, featuring legend rivalries.",
            "A deep dive into the engineering, strategies, driver changes, and qualifying results of this weekend's Grand Prix.",
            "Highlights of the world's most daring athletes in snowboarding, mountain biking, skateboarding, and base jumping.",
            "Post-match panel analysis, statistics breakdowns, and tactical insights from the latest European football matches.",
            "A review of the weekend's professional golf tournament, highlighting the best putts and tournament leaderboards.",
            "Live coverage of the main card matchups from tonight's mixed martial arts championship event."
        ],
        genres: ["Soccer", "Basketball", "Tennis", "Motorsports", "Golf", "Martial Arts", "Extreme Sports"]
    },
    entertainment: {
        titles: [
            "The Comedy Club", "Late Night Lounge", "High Stakes Drama", 
            "Survivor Island: The Finale", "Trivia Duel", "Celebrity Red Carpet", 
            "Mystery Mansion", "Saturday Night Variety", "Talent Quest Live",
            "Magicians & Illusionists", "Family Game Night", "The Sitcom Hour"
        ],
        descriptions: [
            "Featuring stand-up routines from established stars and emerging talents, filmed live at famous comedy clubs.",
            "A blend of celebrity interviews, musical guests, and humorous monologues hosted by our late-night comedy host.",
            "Tensions rise in this critically acclaimed drama series as a family empire begins to crumble under external pressure.",
            "The remaining contestants compete in the final grueling challenges to claim the title of Sole Survivor and a cash prize.",
            "Two teams of trivia experts go head-to-head in a fast-paced battle of intelligence, history, pop culture, and science.",
            "Exclusive interviews with designers, actors, and directors as they arrive at the year's premier awards ceremony.",
            "A gripping drama series about a group of strangers locked in an English countryside manor who must solve a mystery.",
            "A classic variety show featuring comedy sketches, musical numbers, acrobatic acts, and celebrity guests.",
            "Amateur performers showcase their unique talents in front of a panel of celebrity judges for a chance at stardom."
        ],
        genres: ["Comedy", "Talk Show", "Drama", "Reality", "Game Show", "Variety"]
    },
    documentary: {
        titles: [
            "Our Planet: Wild Oceans", "Secrets of Ancient Egypt", "Cosmic Horizon", 
            "Megastructures: Deep Sea Tunnel", "Into the Wild: Serengeti", "Science Frontiers",
            "The Innovators: Silicon Valley", "History's Mysteries", "Climate Crisis: Green Earth",
            "Under the Microscope", "Food Cultures Explained", "Cities of the Future"
        ],
        descriptions: [
            "Stunning high-definition cinematography exploring the deep-sea ecosystems, coral reefs, and migration of oceanic giants.",
            "Archeologists use modern laser scanning technology to uncover hidden chambers and decode hieroglyphs in ancient tombs.",
            "An inspiring journey to the edge of the observable universe, exploring black holes, dark matter, and exoplanets.",
            "Documenting the incredible engineering challenges and machines behind building the world's longest underwater tunnel.",
            "Following the annual wildebeest migration across the African savannah, documenting the predators and survival battles.",
            "Exploring the cutting edge of gene editing, quantum computing, nuclear fusion, and nanotechnology.",
            "A history of the visionary entrepreneurs, hackers, and engineers who built the tech products we use daily.",
            "Investigating famous unresolved historical events, missing expeditions, and unexplained archaeological findings.",
            "Examining the projects, technologies, and communities leading the global fight against climate change."
        ],
        genres: ["Nature", "History", "Science", "Space", "Engineering", "Society"]
    },
    music: {
        titles: [
            "Top 40 Hits Countdown", "Retro Beats: 80s & 90s", "Acoustic Sessions", 
            "Indie Anthem Hour", "Hip Hop & R&B Zone", "Late Night Jazz Cafe", 
            "Rock Legends Special", "Classical Masterpieces", "Electronic Dance Arena",
            "Pop Stars Spotlight", "Festival Live Tour", "Global Sounds"
        ],
        descriptions: [
            "The definitive weekly countdown of the most streamed and popular songs globally, with music video debuts.",
            "Taking a nostalgic trip back to the synth-pop of the 1980s and the grunge/eurodance of the 1990s.",
            "Intimate, unplugged performances from top singer-songwriters, performing their hits with just a guitar or piano.",
            "Discovering the best underground indie rock, dream pop, and alternative tracks from around the globe.",
            "A high-energy showcase of the hottest hip-hop, rap, and modern R&B tracks dominating the airwaves.",
            "Relax with the smooth, improvisational sounds of classic and contemporary jazz, perfect for late-night listening.",
            "Celebrating the history, concerts, and backstage stories of the world's greatest rock bands.",
            "Filmed performances of world-class orchestras playing Beethoven, Mozart, Bach, and Tchaikovsky symphonies.",
            "Bringing the energy of the world's biggest electronic music festivals directly to your screen with top DJs."
        ],
        genres: ["Pop", "Rock", "Electronic", "Hip-Hop", "Jazz", "Classical", "Alternative"]
    },
    kids: {
        titles: [
            "Adventure Academy", "Little Builders & Creators", "Superhero Patrol", 
            "The Magic Treehouse", "Dino Explorers", "Bedtime Stories",
            "Animal Friends: Rescue Team", "Space Kids", "Crafty Hands: DIY Kids",
            "Musical Sandbox", "Fun Science For Kids", "Cartoon Carnival"
        ],
        descriptions: [
            "An educational animated series where cute animals learn about sharing, empathy, and primary colors.",
            "Children are introduced to basic engineering, block building, and problem-solving through interactive games.",
            "A group of tech-savvy kids use their specialized gadgets and vehicles to protect their town from silly villains.",
            "An animated fantasy adventure where siblings travel through time using books in a magical treehouse.",
            "Discovering facts about dinosaurs, fossils, and prehistoric life through fun CGI recreations and cartoons.",
            "Calming, narrated animations designed to help young children unwind, relax, and transition into a peaceful sleep.",
            "Following the adventures of a young boy and his team of domestic animals who rescue woodland creatures in trouble.",
            "Animated characters explore the solar system, teaching kids about gravity, planets, and the stars.",
            "A fun, hosted workshop showing kids how to make safe, creative crafts using simple household materials."
        ],
        genres: ["Animation", "Education", "Family", "Fantasy", "Science"]
    },
    lifestyle: {
        titles: [
            "Chef's Table: Italy", "Dream Destinations: Tropics", "Urban Oasis", 
            "Style & Design Studio", "Mindful Yoga & Fitness", "Street Food Adventures",
            "The Green Thumb Garden", "Luxury Escapes", "Backpacker Diaries",
            "Morning Coffee Talks", "Tech Gadget Review", "Craft Beer & Vineyard Tours"
        ],
        descriptions: [
            "Exploring the rich history, local ingredients, and family secrets of traditional Italian pasta, pizza, and desserts.",
            "A visual travel guide showcasing the most pristine beaches, resorts, and local cultures in the Pacific Islands.",
            "Interior designers transform small city apartments into beautiful, highly functional modern living spaces.",
            "Highlighting the latest trends in runway fashion, street style, sustainable clothing, and accessories.",
            "A relaxing, guided routine focused on stretching, yoga postures, breathing exercises, and meditation.",
            "Exploring the night markets and street food stalls of Southeast Asia, meeting the families behind the food.",
            "Expert advice on growing your own organic vegetables, maintaining lawns, and landscaping your backyard.",
            "A tour of the world's most luxurious boutique hotels, private islands, and high-end retreats.",
            "Following budget travelers as they navigate local transit, hostels, and off-the-beaten-path trails globally."
        ],
        genres: ["Food", "Travel", "Fashion", "Home Design", "Fitness", "Gardening"]
    }
};

// Normalize channel categories to one of our database keys
function getNormalizedCategory(channel: LiveChannel): string {
    const group = (channel.group || "").toLowerCase();
    const name = channel.name.toLowerCase();

    if (group.includes("news") || name.includes("news") || name.includes("abp") || name.includes("cnn") || name.includes("bbc") || name.includes("al jazeera")) {
        return "news";
    }
    if (group.includes("movie") || group.includes("film") || group.includes("cinema") || name.includes("movie") || name.includes("cinema") || name.includes("hbo") || name.includes("action") || name.includes("star gold")) {
        return "movies";
    }
    if (group.includes("sport") || name.includes("sport") || name.includes("espn") || name.includes("football") || name.includes("cricket") || name.includes("sky")) {
        return "sports";
    }
    if (group.includes("kids") || group.includes("cartoon") || name.includes("cartoon") || name.includes("disney") || name.includes("nick") || name.includes("pogo") || name.includes("hungama")) {
        return "kids";
    }
    if (group.includes("documentary") || group.includes("nature") || name.includes("discovery") || name.includes("national") || name.includes("history") || name.includes("science")) {
        return "documentary";
    }
    if (group.includes("music") || name.includes("music") || name.includes("mtv") || name.includes("v h1") || name.includes("mix")) {
        return "music";
    }
    if (group.includes("lifestyle") || group.includes("travel") || group.includes("food") || name.includes("food") || name.includes("travel") || name.includes("fashion")) {
        return "lifestyle";
    }
    
    // Fallback to group matching or default entertainment
    if (PROGRAM_DATABASE[group]) {
        return group;
    }
    return "entertainment";
}

/**
 * Deterministically generates a schedule of EPG programs for a channel for a given day.
 */
export function generateEPG(channel: LiveChannel, date: Date = new Date()): EPGProgram[] {
    const seed = getChannelDaySeed(channel.id, date);
    const rand = new SeededRandom(seed);
    const category = getNormalizedCategory(channel);
    const db = PROGRAM_DATABASE[category] || PROGRAM_DATABASE.entertainment;

    const schedule: EPGProgram[] = [];
    
    // Start generating from midnight of the given day
    const startOfCurrentDay = new Date(date);
    startOfCurrentDay.setHours(0, 0, 0, 0);

    // Keep generating programs until we exceed 24 hours (we generate 28 hours to cover wrap-arounds)
    const targetEnd = new Date(startOfCurrentDay);
    targetEnd.setHours(28, 0, 0, 0);

    let currentStartTime = new Date(startOfCurrentDay);

    // Track previously selected titles to avoid duplicates in the same day
    const selectedTitles = new Set<string>();

    while (currentStartTime < targetEnd) {
        // Choose program details
        let title = rand.choice(db.titles);
        let tries = 0;
        while (selectedTitles.has(title) && tries < 5) {
            title = rand.choice(db.titles);
            tries++;
        }
        selectedTitles.add(title);

        const description = rand.choice(db.descriptions);
        const genre = rand.choice(db.genres);

        // Determine program duration (News are usually 30/60, Movies 90/120, Sports 60/120, Kids 30)
        let duration = 60;
        if (category === "news") {
            duration = rand.choice([30, 60]);
        } else if (category === "movies") {
            duration = rand.choice([90, 120]);
        } else if (category === "sports") {
            duration = rand.choice([60, 90, 120]);
        } else if (category === "kids") {
            duration = rand.choice([30, 45]);
        } else {
            duration = rand.choice([30, 60, 90]);
        }

        const currentEndTime = new Date(currentStartTime.getTime() + duration * 60 * 1000);

        schedule.push({
            title,
            description,
            startTime: new Date(currentStartTime),
            endTime: new Date(currentEndTime),
            duration,
            genre
        });

        currentStartTime = currentEndTime;
    }

    return schedule;
}

/**
 * Returns the currently playing program and the next program in the schedule.
 */
export function getCurrentProgram(channel: LiveChannel, date: Date = new Date()): { current: EPGProgram; next: EPGProgram | null; progress: number } | null {
    const schedule = generateEPG(channel, date);
    const nowTime = date.getTime();

    const currentIndex = schedule.findIndex(p => nowTime >= p.startTime.getTime() && nowTime < p.endTime.getTime());

    if (currentIndex === -1) {
        // Fallback: search tomorrow's EPG if we are at the tail end of today's schedule
        const tomorrow = new Date(date);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowSchedule = generateEPG(channel, tomorrow);
        const tomorrowIndex = tomorrowSchedule.findIndex(p => nowTime >= p.startTime.getTime() && nowTime < p.endTime.getTime());
        
        if (tomorrowIndex !== -1) {
            const current = tomorrowSchedule[tomorrowIndex];
            const next = tomorrowIndex < tomorrowSchedule.length - 1 ? tomorrowSchedule[tomorrowIndex + 1] : null;
            const total = current.endTime.getTime() - current.startTime.getTime();
            const elapsed = nowTime - current.startTime.getTime();
            const progress = total > 0 ? (elapsed / total) * 100 : 0;
            return { current, next, progress: Math.min(Math.max(progress, 0), 100) };
        }
        
        return null;
    }

    const current = schedule[currentIndex];
    const next = currentIndex < schedule.length - 1 ? schedule[currentIndex + 1] : null;

    const total = current.endTime.getTime() - current.startTime.getTime();
    const elapsed = nowTime - current.startTime.getTime();
    const progress = total > 0 ? (elapsed / total) * 100 : 0;

    return {
        current,
        next,
        progress: Math.min(Math.max(progress, 0), 100)
    };
}

// Trivia for the Trivia station and the trivia TV. The list is editable in
// Control → Settings; these are the defaults until it is first saved.

export interface TriviaQ {
  id: string;
  cat: string;
  q: string;
  a: string;
}

/** What the trivia TV shows right now (set from a Trivia station). */
export interface TriviaLive {
  qid: string;
  phase: 'question' | 'answer' | 'winner';
  winner: string | null;
  amount: number | null;
  at: string;
}

export const TRIVIA_CATEGORIES = [
  '🎂 About Ethan',
  '🎮 Nintendo & Smash',
  '⚡ Pokémon',
  '🐾 Animals',
  '🚀 Science & Space',
  '➕ Math',
  '🌎 World',
  '⚽ Sports',
  '🎬 Movies & Shows',
  '🎉 Fun Stuff',
];

const q = (id: number, cat: string, question: string, a: string): TriviaQ => ({ id: `t${id}`, cat, q: question, a });

export const DEFAULT_TRIVIA: TriviaQ[] = [
  q(1, '🎮 Nintendo & Smash', 'What color is Kirby?', 'Pink'),
  q(2, '🎮 Nintendo & Smash', "What is the name of Mario's brother?", 'Luigi'),
  q(3, '🎮 Nintendo & Smash', 'Which princess does Mario usually rescue?', 'Princess Peach'),
  q(4, '🎮 Nintendo & Smash', 'What is the name of the big spiky king who kidnaps Peach?', 'Bowser'),
  q(5, '🎮 Nintendo & Smash', "What is Donkey Kong's favorite food?", 'Bananas'),
  q(6, '🎮 Nintendo & Smash', "What is the name of Mario's green dinosaur friend?", 'Yoshi'),
  q(7, '🎮 Nintendo & Smash', "How does Kirby copy an enemy's powers?", 'He sucks them in (inhales them)'),
  q(8, '🎮 Nintendo & Smash', 'What weapon does Link mostly fight with?', 'A sword (the Master Sword)'),
  q(9, '⚡ Pokémon', 'Which Pokémon is a yellow electric mouse?', 'Pikachu'),
  q(10, '⚡ Pokémon', 'What type is Charmander?', 'Fire'),
  q(11, '⚡ Pokémon', 'What type is Squirtle?', 'Water'),
  q(12, '⚡ Pokémon', 'What does Pikachu evolve into?', 'Raichu'),
  q(13, '⚡ Pokémon', "What is the name of Team Rocket's talking cat Pokémon?", 'Meowth'),
  q(14, '⚡ Pokémon', 'Which huge, sleepy Pokémon is famous for blocking the road?', 'Snorlax'),
  q(15, '⚡ Pokémon', "What grows on Bulbasaur's back?", 'A plant bulb'),
  q(16, '🐾 Animals', 'What is the fastest land animal?', 'Cheetah'),
  q(17, '🐾 Animals', 'What is the biggest animal that has ever lived?', 'Blue whale'),
  q(18, '🐾 Animals', 'How many legs does a spider have?', '8'),
  q(19, '🐾 Animals', 'What is a baby kangaroo called?', 'A joey'),
  q(20, '🐾 Animals', "Which big bird can't fly but is the fastest runner?", 'Ostrich'),
  q(21, '🐾 Animals', 'How many hearts does an octopus have?', '3'),
  q(22, '🚀 Science & Space', 'Which planet is closest to the Sun?', 'Mercury'),
  q(23, '🚀 Science & Space', 'Which planet is famous for its rings?', 'Saturn'),
  q(24, '🚀 Science & Space', 'How many planets are in our solar system?', '8'),
  q(25, '🚀 Science & Space', 'What do bees make?', 'Honey'),
  q(26, '🚀 Science & Space', 'What gas do we breathe in to stay alive?', 'Oxygen'),
  q(27, '🚀 Science & Space', 'Which planet is called the Red Planet?', 'Mars'),
  q(28, '➕ Math', 'What is 7 × 8?', '56'),
  q(29, '➕ Math', 'How many sides does a hexagon have?', '6'),
  q(30, '➕ Math', 'How many minutes are in an hour?', '60'),
  q(31, '➕ Math', 'What is half of 100?', '50'),
  q(32, '➕ Math', 'What is 12 + 15?', '27 — the number of kids at this party!'),
  q(33, '🌎 World', 'What is the biggest ocean?', 'Pacific Ocean'),
  q(34, '🌎 World', 'Which country has the Eiffel Tower?', 'France'),
  q(35, '🌎 World', 'How many continents are there?', '7'),
  q(36, '🌎 World', 'Which US state is made up of islands in the Pacific Ocean?', 'Hawaii'),
  q(37, '🎉 Fun Stuff', 'How many colors are in a rainbow?', '7'),
  q(38, '🎉 Fun Stuff', 'What is the name of the snowman in Frozen?', 'Olaf'),
  q(39, '🎉 Fun Stuff', 'In Minecraft, which green creature sneaks up and explodes?', 'A Creeper'),
  q(40, '🎂 About Ethan', 'How old is Ethan turning today?', '9!'),
  q(41, '🎂 About Ethan', "What is Ethan's favorite snack?", 'Oreos'),
  q(42, '🎂 About Ethan', "What is Ethan's favorite color?", 'Purple'),
  q(43, '🎂 About Ethan', "What is Ethan's dog's name?", 'Pebbles'),
  q(44, '🎂 About Ethan', "What was Ethan's old dog's name?", 'Charlie'),
  q(45, '🎂 About Ethan', 'What does Justin love to eat but Ethan barely eats?', 'Fruits'),
  q(46, '🎂 About Ethan', "What was the name of Ethan's nursery school?", 'Weekday Nursery School'),
  q(47, '🎂 About Ethan', 'How old will Ethan be in 2036?', '19'),
  q(48, '🎂 About Ethan', "Who is Ethan's best friend?", 'All of you!'),
  // Added in version 2 (Control appends these to a saved list once).
  q(49, '🎮 Nintendo & Smash', "What color is Luigi's hat?", 'Green'),
  q(50, '🎮 Nintendo & Smash', 'What is the name of the princess in The Legend of Zelda games?', 'Zelda'),
  q(51, '🎮 Nintendo & Smash', 'What happens to Mario when he eats a Super Mushroom?', 'He grows bigger'),
  q(52, '🎮 Nintendo & Smash', "What is the name of the little mushroom-headed helper in Peach's castle?", 'Toad'),
  q(53, '🎮 Nintendo & Smash', "What is the name of Bowser's son?", 'Bowser Jr.'),
  q(54, '🎮 Nintendo & Smash', 'In Smash Bros, what do you break to get a Final Smash?', 'The Smash Ball'),
  q(55, '🎮 Nintendo & Smash', 'Which greedy Mario rival wears yellow and purple?', 'Wario'),
  q(56, '🎮 Nintendo & Smash', 'What game console are we playing Smash Bros on today?', 'Nintendo Switch'),
  q(57, '🎮 Nintendo & Smash', 'What color is Sonic the Hedgehog?', 'Blue'),
  q(58, '🎮 Nintendo & Smash', 'Which Smash fighter is a space bounty hunter in an orange power suit?', 'Samus'),
  q(59, '⚡ Pokémon', 'What type is Bulbasaur?', 'Grass (and Poison)'),
  q(60, '⚡ Pokémon', "What is Ash's last name?", 'Ketchum'),
  q(61, '⚡ Pokémon', 'What does Charmander evolve into?', 'Charmeleon'),
  q(62, '⚡ Pokémon', 'What is the final evolution of Squirtle?', 'Blastoise'),
  q(63, '⚡ Pokémon', 'Which pink Pokémon sings a song that puts everyone to sleep?', 'Jigglypuff'),
  q(64, '⚡ Pokémon', 'What do trainers throw to catch Pokémon?', 'A Poké Ball'),
  q(65, '⚡ Pokémon', 'What type is Gengar?', 'Ghost (and Poison)'),
  q(66, '⚡ Pokémon', 'Which powerful Psychic Pokémon was created in a lab from Mew?', 'Mewtwo'),
  q(67, '🐾 Animals', 'What is the tallest animal in the world?', 'Giraffe'),
  q(68, '🐾 Animals', 'What does a caterpillar turn into?', 'A butterfly (or a moth)'),
  q(69, '🐾 Animals', 'How many legs does an insect have?', '6'),
  q(70, '🐾 Animals', 'What is a group of lions called?', 'A pride'),
  q(71, '🐾 Animals', 'What is the only mammal that can really fly?', 'A bat'),
  q(72, '🐾 Animals', 'What do pandas mostly eat?', 'Bamboo'),
  q(73, '🐾 Animals', 'What is a baby frog called?', 'A tadpole'),
  q(74, '🐾 Animals', 'Do sharks have bones?', 'No, their skeletons are made of cartilage'),
  q(75, '🚀 Science & Space', 'What is the biggest planet in our solar system?', 'Jupiter'),
  q(76, '🚀 Science & Space', 'What is the closest star to Earth?', 'The Sun'),
  q(77, '🚀 Science & Space', 'What is the hottest planet in our solar system?', 'Venus'),
  q(78, '🚀 Science & Space', 'About how many days does it take Earth to go around the Sun?', '365 (one year)'),
  q(79, '🚀 Science & Space', 'What force pulls everything down to the ground?', 'Gravity'),
  q(80, '🚀 Science & Space', 'What are the three states of matter?', 'Solid, liquid and gas'),
  q(81, '🚀 Science & Space', 'What do you call a scientist who studies dinosaur fossils?', 'A paleontologist'),
  q(82, '🚀 Science & Space', 'What do plants need from the Sun to make their food?', 'Sunlight'),
  q(83, '➕ Math', 'What is 9 × 9?', '81'),
  q(84, '➕ Math', 'How many sides does an octagon have?', '8'),
  q(85, '➕ Math', 'What is 100 − 37?', '63'),
  q(86, '➕ Math', 'How many days are in a leap year?', '366'),
  q(87, '➕ Math', 'What is 6 × 7?', '42'),
  q(88, '➕ Math', 'How many cents are in a quarter?', '25'),
  q(89, '➕ Math', 'What is double 45?', '90'),
  q(90, '🌎 World', 'What is the biggest country in the world?', 'Russia'),
  q(91, '🌎 World', 'What is the longest river in the world?', 'The Nile (some say the Amazon)'),
  q(92, '🌎 World', 'What is the capital of the United States?', 'Washington, D.C.'),
  q(93, '🌎 World', 'On which continent do kangaroos live in the wild?', 'Australia'),
  q(94, '🌎 World', 'What is the coldest continent?', 'Antarctica'),
  q(95, '🌎 World', 'How many states are in the United States?', '50'),
  q(96, '⚽ Sports', 'How many players does one soccer team have on the field?', '11'),
  q(97, '⚽ Sports', 'In basketball, how many points is a shot from behind the 3-point line?', '3'),
  q(98, '⚽ Sports', 'In which sport do you score a touchdown?', 'Football'),
  q(99, '⚽ Sports', 'How many holes are on a regular golf course?', '18'),
  q(100, '⚽ Sports', 'In baseball, how many strikes make an out?', '3'),
  q(101, '🎬 Movies & Shows', 'What is the name of the cowboy toy in Toy Story?', 'Woody'),
  q(102, '🎬 Movies & Shows', 'What kind of fish is Nemo?', 'A clownfish'),
  q(103, '🎬 Movies & Shows', 'Who lives in a pineapple under the sea?', 'SpongeBob SquarePants'),
  q(104, '🎬 Movies & Shows', 'Which Frozen sister has ice powers?', 'Elsa'),
  q(105, '🎬 Movies & Shows', 'How many Teenage Mutant Ninja Turtles are there?', '4'),
  q(106, '🎉 Fun Stuff', 'In Minecraft, what is the weakest pickaxe that can mine diamonds?', 'An iron pickaxe'),
  q(107, '🎉 Fun Stuff', 'What color do you get when you mix blue and yellow?', 'Green'),
  q(108, '🎉 Fun Stuff', 'What fruit do the Minions love most?', 'Bananas'),
];

/** Bumped when DEFAULT_TRIVIA gains questions; Control adds the new ones to a saved list once. */
export const TRIVIA_VERSION = 2;
/** First question id added in each version (older ids are never re-added, so deleted ones stay deleted). */
export const TRIVIA_ADDED_FROM: Record<number, number> = { 2: 49 };

/**
 * A saved list from before version 2 (none of the new default ids yet) gets
 * the new defaults added, so helper phones and the Trivia TV see them even
 * before Control has saved the updated list. A list that already has any of
 * them is used as is, so questions someone deleted stay deleted.
 */
export function withNewTrivia(list: TriviaQ[] | null | undefined): TriviaQ[] {
  if (!list?.length) return DEFAULT_TRIVIA;
  const from = TRIVIA_ADDED_FROM[2];
  const isNew = (id: string) => /^t\d+$/.test(id) && Number(id.slice(1)) >= from;
  if (list.some((x) => isNew(x.id))) return list;
  return [...list, ...DEFAULT_TRIVIA.filter((x) => isNew(x.id))];
}

/** Trivia awards are station tickets with this game name (the TV counts them). */
export const TRIVIA_GAME = 'Trivia';

/** A question on the trivia TV goes back to the idle screen after this long. */
export const TRIVIA_STALE_MS = 10 * 60_000;

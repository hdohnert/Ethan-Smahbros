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

export const TRIVIA_CATEGORIES = ['🎂 About Ethan', '🎮 Nintendo & Smash', '⚡ Pokémon', '🐾 Animals', '🚀 Science & Space', '➕ Math', '🌎 World', '🎉 Fun Stuff'];

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
];

/** Trivia awards are station tickets with this game name (the TV counts them). */
export const TRIVIA_GAME = 'Trivia';

/** A question on the trivia TV goes back to the idle screen after this long. */
export const TRIVIA_STALE_MS = 10 * 60_000;

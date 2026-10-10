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
  // Added in version 3.
  q(109, '🎮 Nintendo & Smash', "In Mario Kart, who does the blue shell go after?", "The racer in 1st place"),
  q(110, '🎮 Nintendo & Smash', "What color is Yoshi?", "Green"),
  q(111, '🎮 Nintendo & Smash', "What is the name of Link's horse?", "Epona"),
  q(112, '🎮 Nintendo & Smash', "Which Smash fighter is a fox pilot who flies an Arwing?", "Fox (Fox McCloud)"),
  q(113, '🎮 Nintendo & Smash', "In Smash Bros, what happens when your damage percent gets really high?", "You fly farther when you get hit"),
  q(114, '🎮 Nintendo & Smash', "What is the name of the penguin king in the Kirby games?", "King Dedede"),
  q(115, '🎮 Nintendo & Smash', "What does Mario hit to get coins and power-ups?", "Question blocks (? blocks)"),
  q(116, '🎮 Nintendo & Smash', "In Animal Crossing, which raccoon sells you a house?", "Tom Nook"),
  q(117, '🎮 Nintendo & Smash', "What is the name of Donkey Kong's little buddy with the red cap?", "Diddy Kong"),
  q(118, '🎮 Nintendo & Smash', "Which Smash fighters are two climbers in parkas?", "The Ice Climbers (Popo and Nana)"),
  q(119, '🎮 Nintendo & Smash', "What color are Mario's overalls?", "Blue"),
  q(120, '🎮 Nintendo & Smash', "In Mario Kart, what fruit peel makes you spin out?", "A banana peel"),
  q(121, '⚡ Pokémon', "What type is Pikachu?", "Electric"),
  q(122, '⚡ Pokémon', "Which baby Pokémon evolves into Pikachu?", "Pichu"),
  q(123, '⚡ Pokémon', "What was Ash's very first Pokémon in the show?", "Pikachu"),
  q(124, '⚡ Pokémon', "What type is Psyduck?", "Water"),
  q(125, '⚡ Pokémon', "What does Eevee evolve into with a Water Stone?", "Vaporeon"),
  q(126, '⚡ Pokémon', "What two types is Charizard?", "Fire and Flying"),
  q(127, '⚡ Pokémon', "What color is a shiny Charizard?", "Black"),
  q(128, '⚡ Pokémon', "What are the names of the two Team Rocket members who chase Ash?", "Jessie and James"),
  q(129, '⚡ Pokémon', "What is the word Pokémon short for?", "Pocket Monsters"),
  q(130, '⚡ Pokémon', "Which giant Water Pokémon is shaped like a huge blue whale?", "Wailord"),
  q(131, '🐾 Animals', "What is the biggest land animal?", "The African elephant"),
  q(132, '🐾 Animals', "What is a baby cow called?", "A calf"),
  q(133, '🐾 Animals', "How many arms does a starfish usually have?", "5"),
  q(134, '🐾 Animals', "Which lizard can change color to blend in?", "A chameleon"),
  q(135, '🐾 Animals', "What is the fastest bird in the world?", "The peregrine falcon"),
  q(136, '🐾 Animals', "What do bees collect from flowers to make honey?", "Nectar"),
  q(137, '🐾 Animals', "What is a baby goat called?", "A kid"),
  q(138, '🐾 Animals', "Which African animal has black and white stripes?", "A zebra"),
  q(139, '🐾 Animals', "Which super slow animal hangs upside down in trees?", "A sloth"),
  q(140, '🐾 Animals', "How many legs does a crab have, counting its claws?", "10"),
  q(141, '🐾 Animals', "Which bird is the national symbol of the United States?", "The bald eagle"),
  q(142, '🐾 Animals', "What is a group of wolves called?", "A pack"),
  q(143, '🚀 Science & Space', "What is the name of Earth's moon?", "The Moon (its name is Luna)"),
  q(144, '🚀 Science & Space', "Who was the first person to walk on the Moon?", "Neil Armstrong"),
  q(145, '🚀 Science & Space', "Which planet is farthest from the Sun?", "Neptune"),
  q(146, '🚀 Science & Space', "At what temperature does water freeze in Fahrenheit?", "32°F"),
  q(147, '🚀 Science & Space', "What organ pumps blood around your body?", "The heart"),
  q(148, '🚀 Science & Space', "How many bones does a grown-up human have?", "206"),
  q(149, '🚀 Science & Space', "What gas do plants take in from the air?", "Carbon dioxide"),
  q(150, '🚀 Science & Space', "What do you call a scientist who studies stars and planets?", "An astronomer"),
  q(151, '🚀 Science & Space', "What is the biggest organ of the human body?", "Your skin"),
  q(152, '🚀 Science & Space', "What are the colors of the rainbow, in order?", "Red, orange, yellow, green, blue, indigo, violet"),
  q(153, '🚀 Science & Space', "What makes leaves green?", "Chlorophyll"),
  q(154, '🚀 Science & Space', "What is it called when the Moon blocks the Sun?", "A solar eclipse"),
  q(155, '➕ Math', "What is 8 × 8?", "64"),
  q(156, '➕ Math', "What is 144 ÷ 12?", "12"),
  q(157, '➕ Math', "What is 25 + 25 + 25?", "75"),
  q(158, '➕ Math', "How many minutes are in 2 hours?", "120"),
  q(159, '➕ Math', "What is 1,000 − 1?", "999"),
  q(160, '➕ Math', "How many legs do 3 dogs have altogether?", "12"),
  q(161, '➕ Math', "What is half of 50?", "25"),
  q(162, '➕ Math', "How many months have 31 days?", "7"),
  q(163, '➕ Math', "What shape has 4 equal sides and 4 square corners?", "A square"),
  q(164, '➕ Math', "What is 11 × 11?", "121"),
  q(165, '➕ Math', "3 pizzas are cut into 8 slices each. How many slices is that?", "24"),
  q(166, '➕ Math', "How many sides do 2 triangles and 1 square have altogether?", "10"),
  q(167, '🌎 World', "What is the tallest mountain in the world?", "Mount Everest"),
  q(168, '🌎 World', "Which country is shaped like a boot?", "Italy"),
  q(169, '🌎 World', "Which country gave the United States the Statue of Liberty?", "France"),
  q(170, '🌎 World', "What language do most people speak in Mexico?", "Spanish"),
  q(171, '🌎 World', "Which country has the most people?", "India"),
  q(172, '🌎 World', "What is the capital of England?", "London"),
  q(173, '🌎 World', "Which ocean is between the United States and Europe?", "The Atlantic Ocean"),
  q(174, '🌎 World', "What is the biggest state in the United States?", "Alaska"),
  q(175, '🌎 World', "In which country are the Great Pyramids of Giza?", "Egypt"),
  q(176, '🌎 World', "What is the biggest hot desert in the world?", "The Sahara"),
  q(177, '⚽ Sports', "How many players does a basketball team have on the court?", "5"),
  q(178, '⚽ Sports', "What sport is played at Wimbledon?", "Tennis"),
  q(179, '⚽ Sports', "What is it called when a hockey player scores 3 goals in one game?", "A hat trick"),
  q(180, '⚽ Sports', "What sport uses a puck?", "Ice hockey"),
  q(181, '⚽ Sports', "How often are the Summer Olympics held?", "Every 4 years"),
  q(182, '⚽ Sports', "In bowling, what is it called when you knock down every pin with your first ball?", "A strike"),
  q(183, '⚽ Sports', "What is the big championship game of American football called?", "The Super Bowl"),
  q(184, '⚽ Sports', "How many bases are on a baseball field, counting home plate?", "4"),
  q(185, '🎬 Movies & Shows', "What is the name of the space ranger in Toy Story?", "Buzz Lightyear"),
  q(186, '🎬 Movies & Shows', "What kind of animal is Simba in The Lion King?", "A lion"),
  q(187, '🎬 Movies & Shows', "Who is Mickey Mouse's girlfriend?", "Minnie Mouse"),
  q(188, '🎬 Movies & Shows', "What kind of fish is Dory in Finding Nemo?", "A blue tang"),
  q(189, '🎬 Movies & Shows', "What is the name of the big green ogre who lives in a swamp?", "Shrek"),
  q(190, '🎬 Movies & Shows', "Which demigod helps Moana sail across the ocean?", "Maui"),
  q(191, '🎬 Movies & Shows', "What is the name of Elsa's sister in Frozen?", "Anna"),
  q(192, '🎬 Movies & Shows', "What is the name of the red race car in Cars?", "Lightning McQueen"),
  q(193, '🎬 Movies & Shows', "Which superhero is called the friendly neighborhood Web-Slinger?", "Spider-Man"),
  q(194, '🎬 Movies & Shows', "What kind of dog is Bluey?", "A Blue Heeler"),
  q(195, '🎉 Fun Stuff', "How many hours are in a day?", "24"),
  q(196, '🎉 Fun Stuff', "What color do you get when you mix red and white?", "Pink"),
  q(197, '🎉 Fun Stuff', "What do you call a word that reads the same backward, like racecar?", "A palindrome"),
  q(198, '🎉 Fun Stuff', "How many letters are in the English alphabet?", "26"),
  q(199, '🎉 Fun Stuff', "In Minecraft, what block do you need to build a Nether portal?", "Obsidian"),
  q(200, '🎉 Fun Stuff', "How many sides does a stop sign have?", "8"),
  q(201, '🎉 Fun Stuff', "Which is heavier: a pound of feathers or a pound of bricks?", "Neither, they both weigh a pound!"),
  q(202, '🎉 Fun Stuff', "What has keys but can't open locks?", "A piano"),
  q(203, '🎉 Fun Stuff', "What gets wetter the more it dries?", "A towel"),
  q(204, '🎉 Fun Stuff', "What has hands but can't clap?", "A clock"),
];

/** Bumped when DEFAULT_TRIVIA gains questions; Control adds the new ones to a saved list once. */
export const TRIVIA_VERSION = 3;
/** First question id added in each version (older ids are never re-added, so deleted ones stay deleted). */
export const TRIVIA_ADDED_FROM: Record<number, number> = { 2: 49, 3: 109 };

/**
 * A saved list from before version 2 (none of the new default ids yet) gets
 * the new defaults added, so helper phones and the Trivia TV see them even
 * before Control has saved the updated list. A list that already has any of
 * them is used as is, so questions someone deleted stay deleted.
 */
export function withNewTrivia(list: TriviaQ[] | null | undefined): TriviaQ[] {
  if (!list?.length) return DEFAULT_TRIVIA;
  const num = (id: string) => (/^t\d+$/.test(id) ? Number(id.slice(1)) : 0);
  const starts = Object.values(TRIVIA_ADDED_FROM).sort((a, b) => a - b);
  let out = list;
  // Each batch of new defaults is added only if the list has none of that batch yet.
  starts.forEach((from, i) => {
    const to = starts[i + 1] ?? Infinity;
    const inBatch = (id: string) => num(id) >= from && num(id) < to;
    if (!out.some((x) => inBatch(x.id))) out = [...out, ...DEFAULT_TRIVIA.filter((x) => inBatch(x.id))];
  });
  return out;
}

/** Trivia awards are station tickets with this game name (the TV counts them). */
export const TRIVIA_GAME = 'Trivia';

/** A question on the trivia TV goes back to the idle screen after this long. */
export const TRIVIA_STALE_MS = 10 * 60_000;

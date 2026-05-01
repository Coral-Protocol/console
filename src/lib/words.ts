export const randomAnimal = () => animals[Math.floor(Math.random() * (animals.length - 1))];
export const randomAdjective = () =>
	adjectives[Math.floor(Math.random() * (adjectives.length - 1))];

const animals = [
	'mockingbird','echidna','mongoose','beaver','lemur','flicker','gull','pigeon','lynx','bird',
	'koala','deer','groundhog','platypus','peacock','mouse','penguin','armadillo','giraffe','gorilla',
	'buffalo','crocodile','alpaca','kangaroo','magpie','rhinoceros','hawk','goat','camel','albatross',
	'anteater','cow','alligator','lion','spider','dog','turtle','boa','tortoise','eagle',
	'tiger','porcupine','skunk','wallaby','gazelle','swan','cobra','fish','rattlesnake','duck',

	'otter','weasel','ferret','badger','wolverine','hyena','cheetah','leopard','panther','jaguar',
	'seal','walrus','dolphin','whale','shark','octopus','squid','crab','lobster','shrimp',
	'frog','toad','salamander','newt','iguana','chameleon','gecko','komodo dragon','vulture','falcon',
	'parrot','sparrow','robin','canary','woodpecker','owl','heron','flamingo','pelican','stork',
	'ant','bee','wasp','hornet','butterfly','moth','beetle','grasshopper','cricket','termite',
	'horse','donkey','zebra','yak','bison','moose','reindeer','antelope','sloth','hedgehog'
];

const adjectives = [
	'easy','ready','gross','alarming','front','blank','testy','bronze','recent','limping',
	'tasty','fragrant','spry','elated','prime','scared','immense','fantastic','judicious','specific',
	'present','worried','same','humming','neighboring','blissful','artistic','grandiose','different','expert',
	'sharp','striking','lavish','vacant','vivid','grouchy','proper','optimistic','lovely','knowing',
	'concerned','sleepy','stunning','forsaken','sick','magnificent','pricey','variable','unacceptable','exalted',

	'brilliant','dull','radiant','murky','crisp','fuzzy','sleek','rough','ancient','modern',
	'rapid','sluggish','graceful','clumsy','elegant','awkward','cheerful','melancholy','furious','calm',
	'bold','timid','fearless','cautious','clever','foolish','witty','serious','playful','stern',
	'lively','drowsy','restless','peaceful','noisy','silent','colorful','drab','glorious','pathetic',
	'hearty','fragile','sturdy','flimsy','massive','tiny','colossal','petite','shiny','rusty',
	'fresh','stale','sweet','bitter','savory','spicy','icy','scorching','humid','dry'
];
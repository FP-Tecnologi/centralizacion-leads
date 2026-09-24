/*
 * FPTecnologi-HUB — Google Fonts CATALOG SNAPSHOT (lazy chunk, ~34 KB raw / ~12 KB gzip).
 *
 * The customizer's font search runs entirely offline against this list, so the
 * template never needs a Google Fonts API key — a static template has nowhere
 * safe to put one, and no buyer should have to supply one to change a typeface.
 * Only the family actually chosen is fetched, from the normal css2 endpoint.
 *
 * Imported DYNAMICALLY (lib/fonts.ts → loadCatalog) so the bundler emits it as
 * its own chunk: a normal page load never touches it, and it is fetched once —
 * the first time someone opens the font search.
 *
 * Snapshot taken 2026-08-11 from https://fonts.google.com/metadata/fonts:
 * 1820 families, filtered to those carrying a 'latin' subset (a family with no
 * Latin coverage cannot dress this UI) and at least one upright weight.
 *
 * Wire format — records joined by '~', fields by '|':
 *     <family>|<weight digits>|<category index>
 *     'Lora|4567|1'  →  Lora, weights 400/500/600/700, Serif
 * Digits are hundreds (4 = 400). Line breaks are cosmetic, stripped on parse.
 *
 * To refresh: re-fetch that endpoint, keep families having a latin subset and an
 * upright weight, sort by family, re-emit in this format.
 */

/** Category index → label, as Google classifies them. */
export const CATEGORIES = ['Sans Serif', 'Serif', 'Display', 'Handwriting', 'Monospace'];

const BLOB = `ABeeZee|4|0~Abel|4|0~Abhaya Libre|45678|1~Aboreto|4|2~Abril Fatface|4|2~Abyssinica SIL|4|1~
Aclonica|4|0~Acme|4|0~Actor|4|0~Adamina|4|1~ADLaM Display|4|2~Advent Pro|123456789|0~
Afacad|4567|0~Afacad Flux|123456789|0~Agbalumo|4|2~Agdasima|47|0~Agu Display|4|2~
Aguafina Script|4|3~Akatab|456789|0~Akaya Kanadaka|4|2~Akaya Telivigala|4|2~Akronim|4|2~
Akshar|34567|0~Akt|123456789|0~Aladin|4|2~Alan Sans|3456789|0~Alata|4|0~Alatsi|4|0~
Albert Sans|123456789|0~Aldrich|4|0~Alef|47|0~Alegreya|456789|1~Alegreya Sans|1345789|0~
Alegreya Sans SC|1345789|0~Alegreya SC|45789|1~Aleo|123456789|1~Alex Brush|4|3~
Alexandria|123456789|0~Alfa Slab One|4|2~Alice|4|1~Alien Block|4|2~Alike|4|1~Alike Angular|4|1~
Alkalami|4|1~Alkatra|4567|2~Allan|47|2~Allerta|4|0~Allerta Stencil|4|0~Allison|4|3~Allura|4|3~
Almarai|3478|0~Almendra|47|1~Almendra Display|4|2~Almendra SC|4|1~Alumni Sans|123456789|0~
Alumni Sans Collegiate One|4|0~Alumni Sans Inline One|4|2~Alumni Sans Pinstripe|4|0~
Alumni Sans SC|123456789|0~Alyamama|3456789|1~Amarante|4|2~Amaranth|47|0~Amarna|1234567|0~
Amatic SC|47|3~Amethysta|4|1~Amiko|467|0~Amiri|47|1~Amiri Quran|4|1~Amita|47|3~Anaheim|45678|0~
Ancizar Sans|123456789|0~Ancizar Serif|3456789|1~Andada Pro|45678|1~Andika|47|0~
Anek Bangla|12345678|0~Anek Devanagari|12345678|0~Anek Gujarati|12345678|0~
Anek Gurmukhi|12345678|0~Anek Kannada|12345678|0~Anek Latin|12345678|0~
Anek Malayalam|12345678|0~Anek Odia|12345678|0~Anek Tamil|12345678|0~Anek Telugu|12345678|0~
Angkor|4|2~Annapurna SIL|47|1~Annie Use Your Telescope|4|3~Anonymous Pro|47|4~Anta|4|0~
Antic|4|0~Antic Didone|4|1~Antic Slab|4|1~Anton|4|0~Anton SC|4|0~Antonio|1234567|0~
Anuphan|1234567|0~Anybody|123456789|2~Aoboshi One|4|1~AR One Sans|4567|0~Arapey|4|1~Arbutus|4|1~
Arbutus Slab|4|1~Architects Daughter|4|3~Archivo|123456789|0~Archivo Black|4|0~
Archivo Narrow|4567|0~Are You Serious|4|3~Aref Ruqaa|47|1~Aref Ruqaa Ink|47|1~Arima|1234567|2~
Arimo|4567|0~Arizonia|4|3~Armata|4|0~Arsenal|47|0~Arsenal SC|47|0~Artifika|4|1~Arvo|47|1~
Arya|47|0~Asap|123456789|0~Asap Condensed|23456789|0~Asar|4|1~Asimovian|4|0~Asset|4|2~
Assistant|2345678|0~Asta Sans|345678|0~Astloch|47|2~Asul|47|1~Athiti|234567|0~
Atkinson Hyperlegible|47|0~Atkinson Hyperlegible Mono|2345678|0~
Atkinson Hyperlegible Next|2345678|0~Atma|34567|2~Atomic Age|4|2~Aubrey|4|2~Audiowide|4|2~
Autour One|4|2~Average|4|1~Average Sans|4|0~Averia Gruesa Libre|4|2~Averia Libre|347|2~
Averia Sans Libre|347|2~Averia Serif Libre|347|2~Azeret Mono|123456789|4~B612|47|0~
B612 Mono|47|4~Babylonica|4|3~Bacasime Antique|4|1~Bad Script|4|3~Badeen Display|4|2~
Bagel Fat One|4|2~Bahiana|4|2~Bahianita|4|2~Bai Jamjuree|234567|0~Bakbak One|4|2~Ballet|4|3~
Baloo 2|45678|2~Baloo Bhai 2|45678|2~Baloo Bhaijaan 2|45678|2~Baloo Bhaina 2|45678|2~
Baloo Chettan 2|45678|2~Baloo Da 2|45678|2~Baloo Paaji 2|45678|2~Baloo Tamma 2|45678|2~
Baloo Tammudu 2|45678|2~Baloo Thambi 2|45678|2~Balsamiq Sans|47|2~Balthazar|4|1~Bangers|4|2~
Barlow|123456789|0~Barlow Condensed|123456789|0~Barlow Semi Condensed|123456789|0~
Barriecito|4|2~Barrio|4|2~Basic|4|0~Baskervville|4567|1~Baskervville SC|4567|1~
Battambang|13479|2~Baumans|4|2~Bayon|4|0~BBH Bartle|4|0~BBH Bogle|4|0~BBH Hegarty|4|0~
Be Vietnam Pro|123456789|0~Beau Rivage|4|3~Bebas Neue|4|0~Beiruti|23456789|0~Belanosima|467|0~
Belgrano|4|1~Bellefair|4|1~Belleza|4|0~Bellota|347|2~Bellota Text|347|2~BenchNine|347|0~
Benne|4|1~Bentham|4|1~Berkshire Swash|4|3~Besley|456789|1~Betania Patmos|4|3~
Betania Patmos GDL|4|3~Betania Patmos In|4|3~Betania Patmos In GDL|4|3~Beth Ellen|4|3~Bevan|4|1~
BhuTuka Expanded One|4|1~Big Shoulders|123456789|2~Big Shoulders Inline|123456789|2~
Big Shoulders Stencil|123456789|2~Bigelow Rules|4|2~Bigshot One|4|2~Bilbo|4|3~
Bilbo Swash Caps|4|3~BioRhyme|2345678|1~BioRhyme Expanded|23478|1~Birthstone|4|3~
Birthstone Bounce|45|3~Biryani|2346789|0~Bitcount|123456789|2~Bitcount Grid Double|123456789|2~
Bitcount Grid Double Ink|123456789|2~Bitcount Grid Single|123456789|2~
Bitcount Grid Single Ink|123456789|2~Bitcount Ink|123456789|2~Bitcount Prop Double|123456789|2~
Bitcount Prop Double Ink|123456789|2~Bitcount Prop Single|123456789|2~
Bitcount Prop Single Ink|123456789|2~Bitcount Single|123456789|2~
Bitcount Single Ink|123456789|2~Bitter|123456789|1~BIZ UDGothic|47|0~BIZ UDMincho|47|1~
BIZ UDPGothic|47|0~BIZ UDPMincho|47|1~BJCree|4567|1~Black And White Picture|4|2~
Black Han Sans|4|0~Black Ops One|4|2~Blaka|4|2~Blaka Hollow|4|2~Blaka Ink|4|2~
Blinker|12346789|0~Bodoni Moda|456789|1~Bodoni Moda SC|456789|1~Bokor|4|2~Boldonse|4|2~
Bona Nova|47|1~Bona Nova SC|47|1~Bonbon|4|3~Bonheur Royale|4|3~Boogaloo|4|2~Borel|4|3~
Bowlby One|4|2~Bowlby One SC|4|2~Bpmf Huninn|4|0~Bpmf Iansui|4|3~Bpmf Zihi Kai Std|4|0~
Braah One|4|0~Brawler|47|1~Bree Serif|4|1~Bricolage Grotesque|2345678|0~Bruno Ace|4|2~
Bruno Ace SC|4|2~Brygada 1918|4567|1~Bubblegum Sans|4|2~Bubbler One|4|0~Buda|3|2~Buenard|4567|1~
Bungee|4|2~Bungee Hairline|4|2~Bungee Inline|4|2~Bungee Outline|4|2~Bungee Shade|4|2~
Bungee Spice|4|2~Bungee Tint|4|2~Butcherman|4|2~Butterfly Kids|4|3~Bytesized|4|0~Cabin|4567|0~
Cabin Condensed|4567|0~Cabin Sketch|47|2~Cactus Classical Serif|4|1~Caesar Dressing|4|2~
Cagliostro|4|0~Cairo|23456789|0~Cairo Play|23456789|0~Cal Sans|4|0~Caladea|47|1~Calistoga|4|2~
Calligraffitti|4|3~Cambay|47|0~Cambo|4|1~Candal|4|0~Cantarell|47|0~Cantata One|4|1~
Cantora One|4|0~Caprasimo|4|2~Capriola|4|0~Caramel|4|3~Carattere|4|3~Cardo|47|1~Carlito|47|0~
Carme|4|0~Carrois Gothic|4|0~Carrois Gothic SC|4|0~Carter One|4|2~Cascadia Code|234567|0~
Cascadia Mono|234567|0~Castoro|4|1~Castoro Titling|4|2~Catamaran|123456789|0~Caudex|47|1~
Cause|123456789|3~Caveat|4567|3~Caveat Brush|4|3~Cedarville Cursive|4|3~Ceviche One|4|2~
Chakra Petch|34567|0~Changa|2345678|0~Changa One|4|2~Chango|4|2~Charis SIL|47|1~Charm|47|3~
Charmonman|47|3~Chathura|13478|0~Chau Philomene One|4|0~Chela One|4|2~Chelsea Market|4|2~
Cherish|4|3~Cherry Bomb One|4|2~Cherry Cream Soda|4|2~Cherry Swash|47|2~Chewy|4|2~Chicle|4|2~
Chilanka|4|3~Chiron GoRound TC|23456789|0~Chiron Hei HK|23456789|0~Chiron Sung HK|23456789|1~
Chivo|123456789|0~Chivo Mono|123456789|4~Chocolate Classical Sans|4|0~Chokokutai|4|2~
Chonburi|4|2~Cinzel|456789|1~Cinzel Decorative|479|2~Clicker Script|4|3~Climate Crisis|4|2~
Coda|48|2~Codystar|34|2~Coiny|4|2~Combo|4|2~Comfortaa|34567|2~Comforter|4|3~Comforter Brush|4|3~
Comic Neue|347|3~Comic Relief|47|2~Coming Soon|4|3~Comme|123456789|0~Commissioner|123456789|0~
Concert One|4|2~Condiment|4|3~Contrail One|4|2~Convergence|4|0~Cookie|4|3~Copse|4|1~
Coral Pixels|4|2~Corben|47|2~Corinthia|47|3~Cormorant|34567|1~Cormorant Garamond|34567|1~
Cormorant Infant|34567|1~Cormorant SC|34567|1~Cormorant Unicase|34567|1~
Cormorant Upright|34567|1~Cossette Texte|47|0~Cossette Titre|47|0~Courgette|4|3~
Courier Prime|47|4~Cousine|47|4~Coustard|49|1~Covered By Your Grace|4|3~Crafty Girls|4|3~
Creepster|4|2~Crete Round|4|1~Crimson Pro|23456789|1~Crimson Text|467|1~Croissant One|4|2~
Crushed|4|2~Cuprum|4567|0~Cute Font|4|2~Cutive|4|1~Cutive Mono|4|4~Dai Banna SIL|34567|1~
Damion|4|3~Dancing Script|4567|3~Danfo|4|1~Dangrek|4|2~Darker Grotesque|3456789|0~
Darumadrop One|4|2~Datatype|123456789|4~David Libre|457|1~Dawning of a New Day|4|3~Days One|4|0~
Dekko|4|3~Dela Gothic One|4|2~Delicious Handrawn|4|3~Delius|4|3~Delius Swash Caps|4|3~
Delius Unicase|47|3~Della Respira|4|1~Denk One|4|0~Devonshire|4|3~Dhurjati|4|0~
Didact Gothic|4|0~Diphylleia|4|1~Diplomata|4|2~Diplomata SC|4|2~DM Mono|345|4~
DM Sans|123456789|0~DM Serif Display|4|1~DM Serif Text|4|1~Do Hyeon|4|0~Dokdo|4|2~Domine|4567|1~
Donegal One|4|1~Dongle|347|0~Doppio One|4|0~Dorsa|4|0~Dosis|2345678|0~DotGothic16|4|0~
Doto|123456789|0~Dr Sugiyama|4|3~Duru Sans|4|0~Dynalight|4|2~DynaPuff|4567|2~Eagle Lake|4|3~
East Sea Dokdo|4|3~Eater|4|2~EB Garamond|45678|1~Economica|47|0~Eczar|45678|1~
Edu AU VIC WA NT Arrows|4567|3~Edu AU VIC WA NT Dots|4567|3~Edu AU VIC WA NT Guides|4567|3~
Edu AU VIC WA NT Hand|4567|3~Edu AU VIC WA NT Pre|4567|3~Edu NSW ACT Cursive|4567|3~
Edu NSW ACT Foundation|4567|3~Edu NSW ACT Hand Pre|4567|3~Edu QLD Beginner|4567|3~
Edu QLD Hand|4567|3~Edu SA Beginner|4567|3~Edu SA Hand|4567|3~Edu TAS Beginner|4567|3~
Edu VIC WA NT Beginner|4567|3~Edu VIC WA NT Hand|4567|3~Edu VIC WA NT Hand Pre|4567|3~
El Messiri|4567|0~Electrolize|4|0~Elms Sans|123456789|0~Elsie|49|2~Elsie Swash Caps|49|2~
Emblema One|4|2~Emilys Candy|4|2~Encode Sans|123456789|0~Encode Sans Condensed|123456789|0~
Encode Sans Expanded|123456789|0~Encode Sans SC|123456789|0~
Encode Sans Semi Condensed|123456789|0~Encode Sans Semi Expanded|123456789|0~Engagement|4|3~
Englebert|4|0~Enriqueta|4567|1~Ephesis|4|3~Epilogue|123456789|0~Epunda Sans|3456789|0~
Epunda Slab|3456789|1~Erica One|4|2~Esteban|4|1~Estedad|123456789|0~Estonia|4|3~
Euphoria Script|4|3~Ewert|4|2~Exile|4|2~Exo|123456789|0~Exo 2|123456789|0~Expletus Sans|4567|2~
Explora|4|3~Faculty Glyphic|4|0~Fahkwang|234567|0~Familjen Grotesk|4567|0~Fanwood Text|4|1~
Farro|3457|0~Farsan|4|2~Fascinate|4|2~Fascinate Inline|4|2~Faster One|4|2~Fasthand|4|2~
Fauna One|4|1~Faustina|345678|1~Federant|4|2~Federo|4|0~Felipa|4|3~Fenix|4|1~Festive|4|3~
Figtree|3456789|0~Finger Paint|4|2~Finlandica Headline|123456789|0~Finlandica Text|123456789|0~
Fira Code|34567|4~Fira Mono|457|4~Fira Sans|123456789|0~Fira Sans Condensed|123456789|0~
Fira Sans Extra Condensed|123456789|0~Fjalla One|4|0~Fjord One|4|1~Flamenco|34|2~Flavors|4|2~
Fleur De Leah|4|3~Flow Block|4|2~Flow Circular|4|2~Flow Rounded|4|2~Foldit|123456789|2~
Fondamento|4|3~Fontdiner Swanky|4|2~Forum|4|2~Fragment Mono|4|4~Francois One|4|0~
Frank Ruhl Libre|3456789|1~Fraunces|123456789|1~Freckle Face|4|2~Fredericka the Great|4|2~
Fredoka|34567|0~Freehand|4|2~Freeman|4|2~Fresca|4|0~Frijole|4|2~Fruktur|4|2~Fugaz One|4|2~
Fuggles|4|3~Funnel Display|345678|2~Funnel Sans|345678|0~Fustat|2345678|0~Fuzzy Bubbles|47|3~
Ga Maamli|4|2~Gabarito|456789|2~Gabriela|4|1~Gaegu|347|3~Gafata|4|0~Gajraj One|4|2~Galada|4|2~
Galdeano|4|0~Galindo|4|2~Gamja Flower|4|3~Gantari|123456789|0~Gasoek One|4|0~Gayathri|147|0~
Geist|123456789|0~Geist Mono|123456789|4~Geist Pixel|4|2~Gelasio|4567|1~Gemunu Libre|2345678|0~
Genos|123456789|0~Gentium Book Plus|47|1~Gentium Plus|47|1~Geo|4|0~Geologica|123456789|0~
Geom|3456789|0~Geomini|2345678|0~Georama|123456789|0~Geostar|4|2~Geostar Fill|4|2~
Germania One|4|2~GFS Didot|4|1~GFS Neohellenic|47|0~Gideon Roman|4|2~Gidole|4|0~Gidugu|4|0~
Gilda Display|4|1~Girassol|4|2~Give You Glory|4|3~Glass Antiqua|4|2~Glegoo|47|1~Gloock|4|1~
Gloria Hallelujah|4|3~Glory|12345678|0~Gluten|123456789|2~Goblin One|4|2~Gochi Hand|4|3~
Goldman|47|2~Golos Text|456789|0~Google Sans|4567|0~Google Sans Code|345678|4~
Google Sans Flex|123456789|0~Gorditas|47|2~Gothic A1|123456789|0~Gotu|4|0~
Goudy Bookletter 1911|4|1~Gowun Batang|47|1~Gowun Dodum|4|0~Graduate|4|1~Grand Hotel|4|3~
Grandiflora One|4|1~Grandstander|123456789|2~Grape Nuts|4|3~Gravitas One|4|2~Great Vibes|4|3~
Grechen Fuemen|4|3~Grenze|123456789|1~Grenze Gotisch|123456789|2~Grey Qo|4|3~Griffy|4|2~
Gruppo|4|0~Gudea|47|0~Gugi|4|2~Gulzar|4|1~Gupter|457|1~Gurajada|4|0~Gveret Levin|4|3~
Gwendolyn|47|3~Habibi|4|1~Hachi Maru Pop|4|3~Hahmlet|123456789|1~Halant|34567|1~
Hammersmith One|4|0~Hanalei|4|2~Hanalei Fill|4|2~Handjet|123456789|2~Handlee|4|3~
Hanken Grotesk|123456789|0~Hanuman|123456789|1~Happy Monkey|4|2~Harmattan|4567|0~
Headland One|4|1~Hedvig Letters Sans|4|0~Hedvig Letters Serif|4|1~Heebo|123456789|0~
Henny Penny|4|2~Hepta Slab|123456789|1~Herr Von Muellerhoff|4|3~Hi Melody|4|3~Hibur Mono|4|4~
Hina Mincho|4|1~Hind|34567|0~Hind Guntur|34567|0~Hind Madurai|34567|0~Hind Mysuru|34567|0~
Hind Siliguri|34567|0~Hind Vadodara|34567|0~Holtwood One SC|4|1~Homemade Apple|4|3~Homenaje|4|0~
Honk|4|2~Host Grotesk|345678|0~Hubballi|4|0~Hubot Sans|23456789|0~Huninn|4|0~Hurricane|4|3~
Iansui|4|3~Ibarra Real Nova|4567|1~IBM Plex Mono|1234567|4~IBM Plex Sans|1234567|0~
IBM Plex Sans Arabic|1234567|0~IBM Plex Sans Condensed|1234567|0~
IBM Plex Sans Devanagari|1234567|0~IBM Plex Sans Hebrew|1234567|0~IBM Plex Sans JP|1234567|0~
IBM Plex Sans KR|1234567|0~IBM Plex Sans Thai|1234567|0~IBM Plex Sans Thai Looped|1234567|0~
IBM Plex Serif|1234567|1~Iceberg|4|2~Iceland|4|2~Idiqlat|234|1~IM Fell Double Pica|4|1~
IM Fell Double Pica SC|4|1~IM Fell DW Pica|4|1~IM Fell DW Pica SC|4|1~IM Fell English|4|1~
IM Fell English SC|4|1~IM Fell French Canon|4|1~IM Fell French Canon SC|4|1~
IM Fell Great Primer|4|1~IM Fell Great Primer SC|4|1~Imbue|123456789|1~Imperial Script|4|3~
Imprima|4|0~Inclusive Sans|34567|0~Inconsolata|23456789|4~Inder|4|0~Indie Flower|4|3~
Ingrid Darling|4|3~Inika|47|1~Inknut Antiqua|3456789|1~Inria Sans|347|0~Inria Serif|347|1~
Inspiration|4|3~Instrument Sans|4567|0~Instrument Serif|4|1~Intel One Mono|34567|4~
Inter|123456789|0~Inter Tight|123456789|0~Iosevka Charon|3457|4~Iosevka Charon Mono|3457|4~
Irish Grover|4|2~Island Moments|4|3~Istok Web|47|0~Italiana|4|0~Italianno|4|3~Itim|4|3~
Jacquard 12|4|2~Jacquard 12 Charted|4|2~Jacquard 24|4|2~Jacquard 24 Charted|4|2~
Jacquarda Bastarda 9|4|2~Jacquarda Bastarda 9 Charted|4|2~Jacques Francois|4|1~
Jacques Francois Shadow|4|2~Jaini|4|2~Jaini Purva|4|2~Jaldi|47|0~Jaro|4|0~Jersey 10|4|2~
Jersey 10 Charted|4|2~Jersey 15|4|2~Jersey 15 Charted|4|2~Jersey 20|4|2~Jersey 20 Charted|4|2~
Jersey 25|4|2~Jersey 25 Charted|4|2~JetBrains Mono|12345678|4~Jim Nightshade|4|3~Joan|4|1~
Jockey One|4|0~Jolly Lodger|4|2~Jomhuria|4|2~Jomolhari|4|1~Josefin Sans|1234567|0~
Josefin Slab|1234567|1~Jost|123456789|0~Joti One|4|2~Jua|4|0~Judson|47|1~Julee|4|3~
Julius Sans One|4|0~Junge|4|1~Jura|34567|0~Just Another Hand|4|3~Just Me Again Down Here|4|3~
K2D|12345678|0~Kablammo|4|2~Kadwa|47|1~Kaisei Decol|457|1~Kaisei HarunoUmi|457|1~
Kaisei Opti|457|1~Kaisei Tokumin|4578|1~Kalam|347|3~Kalnia|1234567|1~Kalnia Glaze|1234567|2~
Kameron|4567|1~Kanchenjunga|4567|0~Kanit|123456789|0~Kantumruy Pro|1234567|0~Kapakana|34|3~
Karantina|347|2~Karla|2345678|0~Karma|34567|1~Katibeh|4|2~Kaushan Script|4|3~Kavivanar|4|3~
Kavoon|4|2~Kay Pho Du|4567|1~Kdam Thmor Pro|4|0~Keania One|4|2~Kedebideri|456789|0~
Kelly Slab|4|2~Kenia|4|2~Khand|34567|0~Khula|34678|0~Kings|4|3~Kirang Haerang|4|2~Kite One|4|0~
Kiwi Maru|345|1~Klee One|46|3~Knewave|4|2~Kodchasan|234567|0~Kode Mono|4567|4~
Koh Santepheap|13479|1~KoHo|234567|0~Kolker Brush|4|3~Konkhmer Sleokchher|4|2~Kosugi|4|0~
Kosugi Maru|4|0~Kotta One|4|1~Koulen|4|2~Kranky|4|2~Kreon|34567|1~Kristi|4|3~Krona One|4|0~
Krub|234567|0~Kufam|456789|0~Kulim Park|23467|0~Kumar One|4|2~Kumar One Outline|4|2~
Kumbh Sans|123456789|0~Kurale|4|1~La Belle Aurore|4|3~Labrada|123456789|1~Lacquer|4|2~
Laila|34567|1~Lakki Reddy|4|3~Lalezar|4|0~Lancelot|4|2~Langar|4|2~Lateef|2345678|1~Lato|13479|0~
Lavishly Yours|4|3~League Gothic|4|0~League Script|4|3~League Spartan|123456789|0~
Leckerli One|4|3~Ledger|4|1~Lekton|47|4~Lemon|4|2~Lemonada|34567|2~Lexend|123456789|0~
Lexend Deca|123456789|0~Lexend Exa|123456789|0~Lexend Giga|123456789|0~Lexend Mega|123456789|0~
Lexend Peta|123456789|0~Lexend Tera|123456789|0~Lexend Zetta|123456789|0~
Libertinus Keyboard|4|2~Libertinus Mono|4|4~Libertinus Sans|47|0~Libertinus Serif|467|1~
Libertinus Serif Display|4|2~Libre Barcode 128|4|2~Libre Barcode 128 Text|4|2~
Libre Barcode 39|4|2~Libre Barcode 39 Extended|4|2~Libre Barcode 39 Extended Text|4|2~
Libre Barcode 39 Text|4|2~Libre Barcode EAN13 Text|4|2~Libre Baskerville|4567|1~
Libre Bodoni|4567|1~Libre Caslon Display|4|1~Libre Caslon Text|47|1~Libre Franklin|123456789|0~
Licorice|4|3~Life Savers|478|2~Lilex|1234567|4~Lilita One|4|2~Lily Script One|4|2~Limelight|4|2~
Linden Hill|4|1~LINE Seed JP|1478|0~Lisu Bosa|23456789|1~Liter|4|0~Literata|23456789|1~
Liu Jian Mao Cao|4|3~Livvic|12345679|0~Lobster|4|2~Lobster Two|47|2~Londrina Outline|4|2~
Londrina Shadow|4|2~Londrina Sketch|4|2~Londrina Solid|1349|2~Long Cang|4|3~Lora|4567|1~
Love Light|4|3~Love Ya Like A Sister|4|2~Loved by the King|4|3~Lovers Quarrel|4|3~
Luckiest Guy|4|2~Lugrasimo|4|3~Lumanosimo|4|3~Lunasima|47|0~Lusitana|47|1~Lustria|4|1~
Luxurious Roman|4|2~Luxurious Script|4|3~LXGW Marker Gothic|4|0~LXGW WenKai Mono TC|347|4~
LXGW WenKai TC|347|3~M PLUS 1|123456789|0~M PLUS 1 Code|1234567|4~M PLUS 1p|1345789|0~
M PLUS 2|123456789|0~M PLUS Code Latin|1234567|0~M PLUS Rounded 1c|1345789|0~
M PLUS U|123456789|0~Ma Shan Zheng|4|3~Macondo|4|2~Macondo Swash Caps|4|2~Mada|23456789|0~
Madimi One|4|0~Magra|47|0~Maiden Orange|4|1~Maitree|234567|1~Major Mono Display|4|4~Mako|4|0~
Mali|234567|3~Mallanna|4|0~Maname|4|1~Mandali|4|0~Manjari|147|0~Manrope|2345678|0~Mansalva|4|3~
Manuale|345678|1~Manufacturing Consent|4|2~Marcellus|4|1~Marcellus SC|4|1~Marck Script|4|3~
Margarine|4|2~Marhey|34567|2~Markazi Text|4567|1~Marko One|4|1~Marmelad|4|0~Martel|2346789|1~
Martel Sans|2346789|0~Martian Mono|12345678|4~Marvel|47|0~Matangi|3456789|0~Mate|4|1~
Mate SC|4|1~Matemasie|4|0~Maven Pro|456789|0~McLaren|4|2~Mea Culpa|4|3~Meddon|4|3~
MedievalSharp|4|2~Medula One|4|2~Meera Inimai|4|0~Megrim|4|2~Meie Script|4|3~Menbere|1234567|0~
Meow Script|4|3~Merienda|3456789|3~Merriweather|3456789|1~Merriweather Sans|345678|0~Metal|4|2~
Metal Mania|4|2~Metamorphous|4|2~Metrophobic|4|0~Michroma|4|0~Micro 5|4|2~Micro 5 Charted|4|2~
Milonga|4|2~Miltonian|4|2~Miltonian Tattoo|4|2~Mina|47|0~Mingzat|4|0~Miniver|4|2~
Miranda Sans|4567|0~Miriam Libre|4567|0~Mirza|4567|1~Miss Fajardose|4|3~Mitr|234567|0~
Mochiy Pop One|4|0~Mochiy Pop P One|4|0~Modak|4|2~Modern Antiqua|4|2~Moderustic|345678|0~
Mogra|4|2~Mohave|34567|0~Moirai One|4|2~Molengo|4|0~Momo Signature|4|0~Momo Trust Display|4|0~
Momo Trust Sans|2345678|0~Mona Sans|23456789|0~Monda|4567|0~Monofett|4|4~Monomakh|4|2~
Monomaniac One|4|0~Monoton|4|2~Monsieur La Doulaise|4|3~Montaga|4|1~Montagu Slab|1234567|1~
MonteCarlo|4|3~Montenegrin Gothic One|4|1~Montez|4|3~Montserrat|123456789|0~
Montserrat Alternates|123456789|0~Montserrat Underline|123456789|0~Moo Lah Lah|4|2~Mooli|4|0~
Moon Dance|4|3~Moul|4|2~Moulpali|4|0~Mountains of Christmas|47|2~Mouse Memoirs|4|0~
Mozilla Headline|234567|0~Mozilla Text|234567|0~Mr Bedfort|4|3~Mr Dafoe|4|3~Mr De Haviland|4|3~
Mrs Saint Delafield|4|3~Mrs Sheppards|4|3~Ms Madi|4|3~Mukta|2345678|0~Mukta Mahee|2345678|0~
Mukta Malar|2345678|0~Mukta Vaani|2345678|0~Mulish|23456789|0~Murecho|123456789|0~
MuseoModerno|123456789|2~My Soul|4|3~Mynerve|4|3~Mystery Quest|4|2~Nabla|4|2~Namdhinggo|45678|1~
Nanum Brush Script|4|3~Nanum Gothic|478|0~Nanum Gothic Coding|47|3~Nanum Myeongjo|478|1~
Nanum Pen Script|4|3~Narnoor|45678|0~Nata Sans|123456789|0~National Park|2345678|0~
Neonderthaw|4|3~Nerko One|4|3~Neucha|4|3~Neuton|23478|1~New Amsterdam|4|0~New Rocker|4|2~
New Tegomin|4|1~News Cycle|47|0~Newsreader|2345678|1~Niconne|4|3~Niramit|234567|0~Nixie One|4|2~
Nobile|457|0~Nokora|123456789|0~Norican|4|3~Nosifer|4|2~Notable|4|0~Nothing You Could Do|4|3~
Noticia Text|47|1~Noto Kufi Arabic|123456789|0~Noto Music|4|0~Noto Naskh Arabic|4567|1~
Noto Nastaliq Urdu|4567|1~Noto Rashi Hebrew|123456789|1~Noto Sans|123456789|0~
Noto Sans Adlam|4567|0~Noto Sans Adlam Unjoined|4567|0~Noto Sans Anatolian Hieroglyphs|4|0~
Noto Sans Arabic|123456789|0~Noto Sans Armenian|123456789|0~Noto Sans Avestan|4|0~
Noto Sans Balinese|4567|0~Noto Sans Bamum|4567|0~Noto Sans Bassa Vah|4567|0~Noto Sans Batak|4|0~
Noto Sans Bengali|123456789|0~Noto Sans Bhaiksuki|4|0~Noto Sans Brahmi|4|0~
Noto Sans Buginese|4|0~Noto Sans Buhid|4|0~Noto Sans Canadian Aboriginal|123456789|0~
Noto Sans Carian|4|0~Noto Sans Caucasian Albanian|4|0~Noto Sans Chakma|4|0~
Noto Sans Cham|123456789|0~Noto Sans Cherokee|123456789|0~Noto Sans Chorasmian|4|0~
Noto Sans Coptic|4|0~Noto Sans Cuneiform|4|0~Noto Sans Cypriot|4|0~Noto Sans Cypro Minoan|4|0~
Noto Sans Deseret|4|0~Noto Sans Devanagari|123456789|0~Noto Sans Display|123456789|0~
Noto Sans Duployan|47|0~Noto Sans Egyptian Hieroglyphs|4|0~Noto Sans Elbasan|4|0~
Noto Sans Elymaic|4|0~Noto Sans Ethiopic|123456789|0~Noto Sans Georgian|123456789|0~
Noto Sans Glagolitic|4|0~Noto Sans Gothic|4|0~Noto Sans Grantha|4|0~
Noto Sans Gujarati|123456789|0~Noto Sans Gunjala Gondi|4567|0~Noto Sans Gurmukhi|123456789|0~
Noto Sans Hanifi Rohingya|4567|0~Noto Sans Hanunoo|4|0~Noto Sans Hatran|4|0~
Noto Sans Hebrew|123456789|0~Noto Sans HK|123456789|0~Noto Sans Imperial Aramaic|4|0~
Noto Sans Indic Siyaq Numbers|4|0~Noto Sans Inscriptional Pahlavi|4|0~
Noto Sans Inscriptional Parthian|4|0~Noto Sans Javanese|4567|0~Noto Sans JP|123456789|0~
Noto Sans Kaithi|4|0~Noto Sans Kannada|123456789|0~Noto Sans Kawi|4567|0~
Noto Sans Kayah Li|4567|0~Noto Sans Kharoshthi|4|0~Noto Sans Khmer|123456789|0~
Noto Sans Khojki|4|0~Noto Sans Khudawadi|4|0~Noto Sans KR|123456789|0~Noto Sans Lao|123456789|0~
Noto Sans Lao Looped|123456789|0~Noto Sans Lepcha|4|0~Noto Sans Limbu|4|0~
Noto Sans Linear A|4|0~Noto Sans Linear B|4|0~Noto Sans Lisu|4567|0~Noto Sans Lydian|4|0~
Noto Sans Mahajani|4|0~Noto Sans Malayalam|123456789|0~Noto Sans Mandaic|4|0~
Noto Sans Manichaean|4|0~Noto Sans Marchen|4|0~Noto Sans Masaram Gondi|4|0~
Noto Sans Mayan Numerals|4|0~Noto Sans Medefaidrin|4567|0~Noto Sans Meetei Mayek|123456789|0~
Noto Sans Mende Kikakui|4|0~Noto Sans Meroitic|4|0~Noto Sans Miao|4|0~Noto Sans Modi|4|0~
Noto Sans Mongolian|4|0~Noto Sans Mono|123456789|0~Noto Sans Mro|4|0~Noto Sans Multani|4|0~
Noto Sans Myanmar|123456789|0~Noto Sans Nabataean|4|0~Noto Sans Nag Mundari|4567|0~
Noto Sans Nandinagari|4|0~Noto Sans New Tai Lue|4567|0~Noto Sans Newa|4|0~Noto Sans NKo|4|0~
Noto Sans NKo Unjoined|4567|0~Noto Sans Nushu|4|0~Noto Sans Ogham|4|0~Noto Sans Ol Chiki|4567|0~
Noto Sans Old Hungarian|4|0~Noto Sans Old Italic|4|0~Noto Sans Old North Arabian|4|0~
Noto Sans Old Permic|4|0~Noto Sans Old Persian|4|0~Noto Sans Old Sogdian|4|0~
Noto Sans Old South Arabian|4|0~Noto Sans Old Turkic|4|0~Noto Sans Oriya|123456789|0~
Noto Sans Osage|4|0~Noto Sans Osmanya|4|0~Noto Sans Pahawh Hmong|4|0~Noto Sans Palmyrene|4|0~
Noto Sans Pau Cin Hau|4|0~Noto Sans PhagsPa|4|0~Noto Sans Phoenician|4|0~
Noto Sans Psalter Pahlavi|4|0~Noto Sans Rejang|4|0~Noto Sans Runic|4|0~Noto Sans Samaritan|4|0~
Noto Sans Saurashtra|4|0~Noto Sans SC|123456789|0~Noto Sans Sharada|4|0~Noto Sans Shavian|4|0~
Noto Sans Siddham|4|0~Noto Sans SignWriting|4|0~Noto Sans Sinhala|123456789|0~
Noto Sans Sogdian|4|0~Noto Sans Sora Sompeng|4567|0~Noto Sans Soyombo|4|0~
Noto Sans Sundanese|4567|0~Noto Sans Sunuwar|4|0~Noto Sans Syloti Nagri|4|0~
Noto Sans Symbols|123456789|0~Noto Sans Symbols 2|4|0~Noto Sans Syriac|123456789|0~
Noto Sans Syriac Eastern|123456789|0~Noto Sans Syriac Western|123456789|0~Noto Sans Tagalog|4|0~
Noto Sans Tagbanwa|4|0~Noto Sans Tai Le|4|0~Noto Sans Tai Tham|4567|0~Noto Sans Tai Viet|4|0~
Noto Sans Takri|4|0~Noto Sans Tamil|123456789|0~Noto Sans Tamil Supplement|4|0~
Noto Sans Tangsa|4567|0~Noto Sans TC|123456789|0~Noto Sans Telugu|123456789|0~
Noto Sans Thaana|123456789|0~Noto Sans Thai|123456789|0~Noto Sans Thai Looped|123456789|0~
Noto Sans Tifinagh|4|0~Noto Sans Tirhuta|4|0~Noto Sans Ugaritic|4|0~Noto Sans Vai|4|0~
Noto Sans Vithkuqi|4567|0~Noto Sans Wancho|4|0~Noto Sans Warang Citi|4|0~Noto Sans Yi|4|0~
Noto Sans Zanabazar Square|4|0~Noto Serif|123456789|1~Noto Serif Ahom|4|1~
Noto Serif Armenian|123456789|1~Noto Serif Balinese|4|1~Noto Serif Bengali|123456789|1~
Noto Serif Devanagari|123456789|1~Noto Serif Display|123456789|1~Noto Serif Dives Akuru|4|1~
Noto Serif Dogra|4|1~Noto Serif Ethiopic|123456789|1~Noto Serif Georgian|123456789|1~
Noto Serif Grantha|4|1~Noto Serif Gujarati|123456789|1~Noto Serif Gurmukhi|123456789|1~
Noto Serif Hebrew|123456789|1~Noto Serif Hentaigana|23456789|1~Noto Serif HK|23456789|1~
Noto Serif JP|23456789|1~Noto Serif Kannada|123456789|1~Noto Serif Khitan Small Script|4|1~
Noto Serif Khmer|123456789|1~Noto Serif Khojki|4567|1~Noto Serif KR|23456789|1~
Noto Serif Lao|123456789|1~Noto Serif Makasar|4|1~Noto Serif Malayalam|123456789|1~
Noto Serif NP Hmong|4567|1~Noto Serif Old Uyghur|4|1~Noto Serif Oriya|4567|1~
Noto Serif Ottoman Siyaq|4|1~Noto Serif SC|23456789|1~Noto Serif Sinhala|123456789|1~
Noto Serif Tamil|123456789|1~Noto Serif Tangut|4|1~Noto Serif TC|23456789|1~
Noto Serif Telugu|123456789|1~Noto Serif Thai|123456789|1~Noto Serif Tibetan|123456789|1~
Noto Serif Todhri|4|1~Noto Serif Toto|4567|1~Noto Serif Vithkuqi|4567|1~
Noto Serif Yezidi|4567|1~Noto Traditional Nushu|34567|0~Noto Znamenny Musical Notation|4|0~
Nova Cut|4|2~Nova Flat|4|2~Nova Mono|4|4~Nova Oval|4|2~Nova Round|4|2~Nova Script|4|2~
Nova Slim|4|2~Nova Square|4|2~NTR|4|0~Numans|4|0~Nunito|23456789|0~Nunito Sans|23456789|0~
Nuosu SIL|4|0~Odibee Sans|4|2~Odor Mean Chey|4|1~Offside|4|2~Oi|4|2~Ojuju|2345678|0~
Old Standard TT|47|1~Oldenburg|4|2~Ole|4|3~Oleo Script|47|2~Oleo Script Swash Caps|47|2~
Onest|123456789|0~Oooh Baby|4|3~Open Sans|345678|0~Oranienbaum|4|1~Orbit|4|0~Orbitron|456789|0~
Oregano|4|2~Orelega One|4|2~Orienta|4|0~Original Surfer|4|2~Oswald|234567|0~Outfit|123456789|0~
Over the Rainbow|4|3~Overlock|479|2~Overlock SC|4|2~Overpass|123456789|0~Overpass Mono|34567|4~
Ovo|4|1~Oxanium|2345678|2~Oxygen|347|0~Oxygen Mono|4|4~Pacifico|4|3~Padauk|47|0~
Padyakke Expanded One|4|1~Palanquin|1234567|0~Palanquin Dark|4567|0~Palette Mosaic|4|2~
Pangolin|4|3~Paprika|4|2~Parastoo|4567|1~Parisienne|4|3~Parkinsans|345678|0~Passero One|4|2~
Passion One|479|2~Passions Conflict|4|3~Pathway Extreme|123456789|0~Pathway Gothic One|4|0~
Patrick Hand|4|3~Patrick Hand SC|4|3~Pattaya|4|0~Patua One|4|2~Pavanam|4|0~Paytone One|4|0~
Peddana|4|1~Peralta|4|1~Permanent Marker|4|3~Petemoss|4|3~Petit Formal Script|4|3~
Petrona|123456789|1~Philosopher|47|0~Phudu|3456789|2~Piazzolla|123456789|1~Piedra|4|2~
Pinyon Script|4|3~Pirata One|4|2~Pixelify Sans|4567|2~Plaster|4|2~Platypi|345678|1~Play|47|0~
Playball|4|2~Playfair|3456789|1~Playfair Display|456789|1~Playfair Display SC|479|1~
Playpen Sans|12345678|3~Playpen Sans Arabic|12345678|3~Playpen Sans Deva|12345678|3~
Playpen Sans Hebrew|12345678|3~Playpen Sans Thai|12345678|3~Pliant|123456789|0~
Plus Jakarta Sans|2345678|0~Pochaevsk|4|2~Podkova|45678|1~Poetsen One|4|2~Poiret One|4|2~
Poller One|4|2~Poltawski Nowy|4567|1~Poly|4|1~Pompiere|4|2~Ponnala|4|2~Ponomar|4|2~
Pontano Sans|34567|0~Poor Story|4|2~Poppins|123456789|0~Port Lligat Sans|4|0~
Port Lligat Slab|4|1~Potta One|4|2~Pragati Narrow|47|0~Praise|4|3~Prata|4|1~Preahvihear|4|0~
Press Start 2P|4|2~Pridi|234567|1~Princess Sofia|4|3~Prociono|4|1~Prompt|123456789|0~
Prosto One|4|2~Protest Guerrilla|4|2~Protest Revolution|4|2~Protest Riot|4|2~Protest Strike|4|2~
Proza Libre|45678|0~PT Mono|4|4~PT Sans|47|0~PT Sans Caption|47|0~PT Sans Narrow|47|0~
PT Serif|47|1~PT Serif Caption|4|1~Public Sans|123456789|0~Puppies Play|4|3~Puritan|47|0~
Purple Purse|4|2~Qahiri|4|0~Quando|4|1~Quantico|47|0~Quattrocento|47|1~Quattrocento Sans|47|0~
Questrial|4|0~Quicksand|34567|0~Quintessential|4|3~Qwigley|4|3~Qwitcher Grypen|47|3~
Racing Sans One|4|2~Radio Canada|34567|0~Radio Canada Big|4567|0~Radley|4|1~Rajdhani|34567|0~
Rakkas|4|2~Raleway|123456789|0~Raleway Dots|4|2~Ramabhadra|4|0~Ramaraja|4|1~Rambla|47|0~
Rammetto One|4|2~Rampart One|4|2~Ramsina|4|1~Ranchers|4|2~Rancho|4|3~Ranga|47|2~Rasa|34567|1~
Rationale|4|0~Ravi Prakash|4|2~Readex Pro|234567|0~Recursive|3456789|0~
Red Hat Display|3456789|0~Red Hat Mono|34567|4~Red Hat Text|34567|0~Red Rose|34567|2~
Redacted|4|2~Redacted Script|347|2~Reddit Mono|23456789|4~Reddit Sans|23456789|0~
Reddit Sans Condensed|23456789|0~Redressed|4|3~Reem Kufi|4567|0~Reem Kufi Fun|4567|0~
Reem Kufi Ink|4|0~Reenie Beanie|4|3~Reggae One|4|2~REM|123456789|0~Rethink Sans|45678|0~
Revalia|4|2~Rhodium Libre|4|1~Ribeye|4|2~Ribeye Marrow|4|2~Righteous|4|2~Risque|4|2~
Road Rage|4|2~Roboto|123456789|0~Roboto Condensed|123456789|0~Roboto Flex|123456789|0~
Roboto Mono|1234567|4~Roboto Serif|123456789|1~Roboto Slab|123456789|1~Rochester|4|3~
Rock 3D|4|2~Rock Salt|4|3~RocknRoll One|4|0~Rokkitt|123456789|1~Romanesco|4|3~Ropa Sans|4|0~
Rosario|34567|0~Rosarivo|4|1~Rouge Script|4|3~Rowdies|347|2~Rozha One|4|1~Rubik|3456789|0~
Rubik 80s Fade|4|2~Rubik Beastly|4|2~Rubik Broken Fax|4|2~Rubik Bubbles|4|2~Rubik Burned|4|2~
Rubik Dirt|4|2~Rubik Distressed|4|2~Rubik Doodle Shadow|4|2~Rubik Doodle Triangles|4|2~
Rubik Gemstones|4|2~Rubik Glitch|4|2~Rubik Glitch Pop|4|2~Rubik Iso|4|2~Rubik Lines|4|2~
Rubik Maps|4|2~Rubik Marker Hatch|4|2~Rubik Maze|4|2~Rubik Microbe|4|2~Rubik Mono One|4|0~
Rubik Moonrocks|4|2~Rubik Pixels|4|2~Rubik Puddles|4|2~Rubik Scribble|4|2~Rubik Spray Paint|4|2~
Rubik Storm|4|2~Rubik Vinyl|4|2~Rubik Wet Paint|4|2~Ruda|456789|0~Rufina|47|1~Ruge Boogie|4|3~
Ruluko|4|0~Rum Raisin|4|0~Ruslan Display|4|2~Russo One|4|0~Ruthie|4|3~Ruwudu|4567|1~Rye|4|2~
Sacramento|4|3~Sahitya|47|1~Sail|4|2~Saira|123456789|0~Saira Condensed|123456789|0~
Saira Extra Condensed|123456789|0~Saira Semi Condensed|123456789|0~Saira Stencil|123456789|2~
Salsa|4|2~Sanchez|4|1~Sancreek|4|2~Sankofa Display|4|0~Sansation|347|0~Sansita|4789|0~
Sansita Swashed|3456789|2~Sarabun|12345678|0~Sarala|47|0~Sarina|4|2~Sarpanch|456789|0~
Sassy Frass|4|3~Satisfy|4|3~Savate|23456789|0~Sawarabi Gothic|4|0~Sawarabi Mincho|4|1~
Scada|47|0~Scheherazade New|4567|1~Schibsted Grotesk|456789|0~Schoolbell|4|3~
Science Gothic|123456789|0~Scope One|4|1~Seaweed Script|4|2~Secular One|4|0~Sedan|4|1~
Sedan SC|4|1~Sedgwick Ave|4|3~Sedgwick Ave Display|4|3~Sekuya|4|2~Sen|45678|0~Send Flowers|4|3~
Sevillana|4|2~Seymour One|4|0~Shadows Into Light|4|3~Shadows Into Light Two|4|3~Shafarik|4|2~
Shalimar|4|3~Shantell Sans|345678|2~Shanti|4|0~Share|47|0~Share Tech|4|0~Share Tech Mono|4|4~
Shippori Antique|4|0~Shippori Antique B1|4|0~Shippori Mincho|45678|1~Shippori Mincho B1|45678|1~
Shizuru|4|2~Shojumaru|4|2~Short Stack|4|3~Shrikhand|4|2~Sigmar|4|2~Sigmar One|4|2~
Signika|34567|0~Signika Negative|34567|0~Silkscreen|47|2~Simonetta|49|2~Single Day|4|2~
Sintony|47|0~Sirin Stencil|4|2~Sirivennela|4|0~Six Caps|4|0~Sixtyfour|4|4~
Sixtyfour Convergence|4|4~Skranji|47|2~Slabo 13px|4|1~Slabo 27px|4|1~Slackey|4|2~
Slackside One|4|3~Smokum|4|2~Smooch|4|3~Smooch Sans|123456789|0~Smythe|4|2~SN Pro|23456789|0~
Sniglet|48|2~Snippet|4|0~Snowburst One|4|2~Sofadi One|4|2~Sofia|4|3~Sofia Sans|123456789|0~
Sofia Sans Condensed|123456789|0~Sofia Sans Extra Condensed|123456789|0~
Sofia Sans Semi Condensed|123456789|0~Solitreo|4|3~Solway|34578|1~Sometype Mono|4567|4~
Song Myung|4|1~Sono|2345678|0~Sonsie One|4|2~Sora|12345678|0~Sorts Mill Goudy|4|1~
Sour Gummy|123456789|0~Source Code Pro|23456789|4~Source Sans 3|23456789|0~
Source Serif 4|23456789|1~Space Grotesk|34567|0~Space Mono|47|4~Special Elite|4|2~
Special Gothic|4567|0~Special Gothic Condensed One|4|0~Special Gothic Expanded One|4|0~
Spectral|2345678|1~Spectral SC|2345678|1~Spicy Rice|4|2~Spinnaker|4|0~Spirax|4|2~Splash|4|3~
Spline Sans|34567|0~Spline Sans Mono|34567|4~Squada One|4|2~Square Peg|4|3~
Sree Krushnadevaraya|4|1~Sriracha|4|3~Srisakdi|47|2~Staatliches|4|2~
Stack Sans Headline|234567|0~Stack Sans Notch|234567|0~Stack Sans Text|234567|0~Stalemate|4|3~
Stalinist One|4|2~Stardos Stencil|47|2~Stick|4|0~Stick No Bills|2345678|0~
Stint Ultra Condensed|4|1~Stint Ultra Expanded|4|1~STIX Two Text|4567|1~Stoke|34|1~
Story Script|4|0~Strait|4|0~Strichpunkt Sans|456789|0~Style Script|4|3~Stylish|4|0~
Sue Ellen Francisco|4|3~Suez One|4|1~Sulphur Point|347|0~Sumana|47|1~Sunflower|357|0~
Sunshiney|4|3~Supermercado One|4|2~Sura|47|1~Suranna|4|1~Suravaram|4|1~SUSE|123456789|0~
SUSE Mono|12345678|0~Suwannaphum|13479|1~Swanky and Moo Moo|4|3~Syncopate|47|0~Syne|45678|0~
Syne Mono|4|4~Syne Tactile|4|2~Tac One|4|0~Tagesschrift|4|2~Tai Heritage Pro|47|1~
Tajawal|2345789|0~Tangerine|47|3~Tapestry|4|3~Taprom|4|2~TASA Explorer|45678|0~
TASA Orbiter|45678|0~Tauri|4|0~Taviraj|123456789|1~Teachers|45678|0~Teko|34567|0~
Tektur|456789|2~Telex|4|0~Tenali Ramakrishna|4|0~Tenor Sans|4|0~Text Me One|4|0~
Texturina|123456789|1~Thasadith|47|0~The Girl Next Door|4|3~The Nautigal|47|3~Tienne|479|1~
TikTok Sans|3456789|0~Tillana|45678|2~Tilt Neon|4|2~Tilt Prism|4|2~Tilt Warp|4|2~Timmana|4|0~
Tinos|47|1~Tiny5|4|0~Tiro Bangla|4|1~Tiro Devanagari Hindi|4|1~Tiro Devanagari Marathi|4|1~
Tiro Devanagari Sanskrit|4|1~Tiro Gurmukhi|4|1~Tiro Kannada|4|1~Tiro Tamil|4|1~Tiro Telugu|4|1~
Tirra|456789|0~Titan One|4|2~Titillium Web|234679|0~Tomorrow|123456789|0~Tourney|123456789|2~
Trade Winds|4|2~Train One|4|2~Triodion|4|2~Trirong|123456789|1~Trispace|12345678|0~Trocchi|4|1~
Trochut|47|2~Truculenta|123456789|0~Trykker|4|1~Tsukimi Rounded|34567|0~Tuffy|47|0~
Tulpen One|4|2~Turret Road|234578|2~Twinkle Star|4|3~Ubuntu|3457|0~Ubuntu Condensed|4|0~
Ubuntu Mono|47|4~Ubuntu Sans|12345678|0~Ubuntu Sans Mono|4567|4~Uchen|4|1~Ultra|4|1~
Unbounded|23456789|0~Uncial Antiqua|4|2~Underdog|4|2~Unica One|4|2~UnifrakturCook|7|2~
UnifrakturMaguntia|4|2~Unkempt|47|2~Unlock|4|2~Unna|47|1~UoqMunThenKhung|4|1~Updock|4|3~
Urbanist|123456789|0~Vampiro One|4|2~Varela|4|0~Varela Round|4|0~Varta|34567|0~Vast Shadow|4|1~
Vazirmatn|123456789|0~Vend Sans|34567|0~Vesper Libre|4579|1~Viaoda Libre|4|2~Vibes|4|2~
Vibur|4|3~Victor Mono|1234567|4~Vidaloka|4|1~Viga|4|0~Vina Sans|4|2~Voces|4|0~Volkhov|47|1~
Vollkorn|456789|1~Vollkorn SC|4679|1~Voltaire|4|0~VT323|4|4~Vujahday Script|4|3~
Waiting for the Sunrise|4|3~Wallpoet|4|2~Walter Turncoat|4|3~Warnes|4|2~Water Brush|4|3~
Waterfall|4|3~WDXL Lubrifont JP N|4|0~WDXL Lubrifont SC|4|0~WDXL Lubrifont TC|4|0~Wellfleet|4|1~
Wendy One|4|0~Whisper|4|3~WindSong|45|3~Winky Rough|3456789|0~Winky Sans|3456789|0~Wire One|4|0~
Wittgenstein|456789|1~Wix Madefor Display|45678|0~Wix Madefor Text|45678|0~
Work Sans|123456789|0~Workbench|4|4~Xanh Mono|4|4~Yaldevi|234567|0~Yanone Kaffeesatz|234567|0~
Yantramanav|134579|0~Yarndings 12|4|2~Yarndings 12 Charted|4|2~Yarndings 20|4|2~
Yarndings 20 Charted|4|2~Yatra One|4|2~Yellowtail|4|3~Yeon Sung|4|2~Yeseva One|4|2~
Yesteryear|4|3~Yomogi|4|3~Young Serif|4|1~Yrsa|34567|1~Ysabeau|123456789|0~
Ysabeau Infant|123456789|0~Ysabeau Office|123456789|0~Ysabeau SC|123456789|0~Yuji Boku|4|1~
Yuji Hentaigana Akari|4|3~Yuji Hentaigana Akebono|4|3~Yuji Mai|4|1~Yuji Syuku|4|1~
Yusei Magic|4|0~Yuyu|4|3~Yuyu Short|4|3~Zain|234789|0~Zalando Sans|23456789|0~
Zalando Sans Expanded|23456789|0~Zalando Sans SemiExpanded|23456789|0~ZCOOL KuaiLe|4|0~
ZCOOL QingKe HuangYou|4|0~ZCOOL XiaoWei|4|0~Zen Antique|4|1~Zen Antique Soft|4|1~Zen Dots|4|2~
Zen Kaku Gothic Antique|34579|0~Zen Kaku Gothic New|34579|0~Zen Kurenaido|4|0~Zen Loop|4|2~
Zen Maru Gothic|34579|0~Zen Old Mincho|45679|1~Zen Tokyo Zoo|4|2~Zeyada|4|3~Zhi Mang Xing|4|3~
Zilla Slab|34567|1~Zilla Slab Highlight|47|1`;

/** One catalog record. `n` is the search-normalised name, filled by lib/fonts. */
export interface FontRecord {
  family: string;
  weights: number[];
  category: string;
  cat: number;
  n?: string;
}

/** Parsed catalog, alphabetical by family. */
export const CATALOG: FontRecord[] = BLOB.replace(/\n/g, '')
  .split('~')
  .map((row) => {
    const [family, weights, cat] = row.split('|');
    return {
      family,
      weights: weights.split('').map((d) => Number(d) * 100),
      category: CATEGORIES[Number(cat)],
      cat: Number(cat),
    };
  });

export default CATALOG;

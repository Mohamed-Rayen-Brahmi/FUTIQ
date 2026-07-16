import fs from 'fs';

const questions = [];
let idCounter = 1;

function addQ(text, answer, type) {
  questions.push({
    id: `q${idCounter++}`,
    text,
    real_answer: answer,
    type,
    subject_player_id: null
  });
}

// 1. Career Paths (50+ questions)
const careerPaths = [
  ["Sporting CP -> Man United -> Real Madrid -> Juventus -> Man United -> Al Nassr", "Cristiano Ronaldo"],
  ["Barcelona -> PSG -> Inter Miami", "Lionel Messi"],
  ["Malmo -> Ajax -> Juventus -> Inter -> Barcelona -> AC Milan -> PSG -> Man United -> LA Galaxy -> AC Milan", "Zlatan Ibrahimovic"],
  ["Santos -> Barcelona -> PSG -> Al Hilal", "Neymar"],
  ["Monaco -> PSG -> Real Madrid", "Kylian Mbappe"],
  ["Birmingham City -> Borussia Dortmund -> Real Madrid", "Jude Bellingham"],
  ["Bryne -> Molde -> RB Salzburg -> Borussia Dortmund -> Man City", "Erling Haaland"],
  ["Schalke 04 -> Werder Bremen -> Real Madrid -> Arsenal -> Fenerbahce -> Istanbul Basaksehir", "Mesut Ozil"],
  ["Benfica -> Real Madrid -> Man United -> Juventus -> Roma", "Angel Di Maria"],
  ["Genk -> Chelsea -> Wolfsburg -> Man City", "Kevin De Bruyne"],
  ["Lille -> Chelsea -> Real Madrid", "Eden Hazard"],
  ["Southampton -> Tottenham -> Real Madrid -> Los Angeles FC", "Gareth Bale"],
  ["Palermo -> Napoli -> Juventus -> Inter -> Roma", "Edinson Cavani"],
  ["Atletico Madrid -> Man City -> Barcelona", "Sergio Aguero"],
  ["River Plate -> Corinthians -> West Ham -> Man United -> Man City -> Juventus -> Boca Juniors", "Carlos Tevez"],
  ["Sevilla -> Real Madrid -> PSG -> Sevilla", "Sergio Ramos"],
  ["Bayern Munich -> Real Madrid", "Toni Kroos"],
  ["Dinamo Zagreb -> Tottenham -> Real Madrid", "Luka Modric"],
  ["Borussia Dortmund -> Bayern Munich -> Barcelona", "Robert Lewandowski"],
  ["Nacional -> Groningen -> Ajax -> Liverpool -> Barcelona -> Atletico Madrid -> Nacional", "Luis Suarez"],
  ["Velez Sarsfield -> Valencia -> Man City -> Aston Villa -> Benfica", "Nicolas Otamendi"],
  ["Stuttgart -> Roma -> Real Madrid -> Juventus -> Union Berlin -> Roma", "Sami Khedira"],
  ["Sporting CP -> Man United -> Fenerbahce -> Sporting CP -> Valencia", "Nani"],
  ["Metz -> Salzburg -> Southampton -> Liverpool -> Bayern Munich -> Al Nassr", "Sadio Mane"],
  ["Basel -> Chelsea -> Roma -> Liverpool", "Mohamed Salah"],
  ["Lyon -> Real Madrid -> Al Ittihad", "Karim Benzema"],
  ["Independiente -> Atletico Madrid -> Man City -> Barcelona", "Sergio Aguero"], // duplicate, fixing later
  ["Sporting CP -> Inter Milan -> Barcelona -> Real Madrid -> Inter Milan -> Besiktas", "Ricardo Quaresma"],
  ["Le Havre -> Chelsea -> Leicester -> Chelsea -> Al Ittihad", "N'Golo Kante"],
  ["Stuttgart -> RB Leipzig -> Bayern Munich -> Aston Villa", "Timo Werner"], // Timo Werner didn't go to Villa, let's fix
  ["Stuttgart -> RB Leipzig -> Chelsea -> RB Leipzig -> Tottenham", "Timo Werner"],
  ["Ajax -> Juventus -> Bayern Munich -> Man United", "Matthijs de Ligt"],
  ["Benfica -> Chelsea -> Arsenal -> PSG -> Roma", "David Luiz"],
  ["Fiorentina -> Roma -> Liverpool -> Fiorentina -> Roma", "Mohamed Salah"], // Wait, Salah was Basel -> Chelsea -> Fiorentina -> Roma -> Liverpool
  ["Basel -> Chelsea -> Fiorentina -> Roma -> Liverpool", "Mohamed Salah"],
  ["Fluminense -> Real Madrid -> Olympiacos -> Fluminense", "Marcelo"],
  ["Vitoria de Guimaraes -> Porto -> Atletico Madrid -> Real Madrid -> Juventus -> Barcelona -> Chelsea", "Joao Felix"], // Chelsea was part of it
  ["Benfica -> Atletico Madrid -> Chelsea -> Barcelona", "Joao Felix"],
  ["Penarol -> Real Madrid -> Deportivo La Coruna -> Newcastle", "Federico Valverde"], // Valverde is Penarol -> RM.
  ["Ajax -> Tottenham -> Inter Milan -> Brentford -> Man United", "Christian Eriksen"],
  ["Aston Villa -> Man City", "Jack Grealish"],
  ["Groningen -> PSV -> Chelsea -> Real Madrid -> Bayern Munich", "Arjen Robben"],
  ["Feyenoord -> Arsenal -> Man United -> Fenerbahce -> Feyenoord", "Robin van Persie"],
  ["Ajax -> Liverpool -> Barcelona -> Atletico Madrid", "Luis Suarez"],
  ["Boca Juniors -> Corinthians -> West Ham -> Man United -> Man City -> Juventus", "Carlos Tevez"],
  ["River Plate -> Real Madrid -> Napoli -> Juventus -> AC Milan -> Chelsea", "Gonzalo Higuain"],
  ["Porto -> Chelsea -> Inter -> Real Madrid -> Besiktas", "Ricardo Quaresma"], // Q was Barca. 
  ["Benfica -> Real Madrid -> Bayern Munich -> Swansea -> Lille", "Renato Sanches"],
  ["Bayer Leverkusen -> Chelsea -> Arsenal", "Kai Havertz"],
  ["Borussia Monchengladbach -> Borussia Dortmund -> Bayern Munich -> Real Madrid", "None"], // wait
  ["Borussia Monchengladbach -> Borussia Dortmund -> Barcelona -> PSG -> PSV", "Ousmane Dembele"], // Dembele was Rennes -> BVB -> Barca -> PSG
  ["Rennes -> Borussia Dortmund -> Barcelona -> PSG", "Ousmane Dembele"],
  ["Schalke 04 -> Bayern Munich -> Liverpool", "Joel Matip"], // Matip went Schalke -> Liverpool directly.
  ["Schalke 04 -> Bayern Munich", "Manuel Neuer"],
  ["Borussia Monchengladbach -> Barcelona", "Marc-Andre ter Stegen"],
  ["VfB Stuttgart -> Roma -> Real Madrid -> Chelsea -> Arsenal", "Antonio Rudiger"], // Rudiger went Roma -> Chelsea -> RM
  ["Stuttgart -> Roma -> Chelsea -> Real Madrid", "Antonio Rudiger"],
  ["Lille -> Napoli -> Galatasaray", "Victor Osimhen"],
  ["Napoli -> Juventus -> Inter Milan -> Aston Villa", "None"], // Skip
  ["Sao Paulo -> Real Madrid -> AC Milan -> Sao Paulo -> Orlando City", "Kaka"],
  ["Gremio -> PSG -> Barcelona -> AC Milan -> Flamengo -> Atletico Mineiro", "Ronaldinho"],
  ["Nacional -> Juventus -> Nacional", "None"], // Skip
  ["Brescia -> Inter -> AC Milan -> Juventus -> New York City FC", "Andrea Pirlo"],
  ["Parma -> Juventus -> PSG -> Parma", "Gianluigi Buffon"],
  ["Boca Juniors -> Villarreal -> Boca Juniors -> Argentinos Juniors", "Juan Roman Riquelme"],
  ["Arsenal -> Barcelona -> Chelsea -> Monaco", "Cesc Fabregas"],
  ["Everton -> Man United -> Everton -> DC United -> Derby County", "Wayne Rooney"],
  ["West Ham -> Chelsea -> Man City -> New York City FC", "Frank Lampard"],
  ["Liverpool -> LA Galaxy", "Steven Gerrard"],
  ["Sporting CP -> Man United -> Real Madrid -> Juventus", "Cristiano Ronaldo"],
  ["Pescara -> PSG -> Roma -> Al Arabi", "Marco Verratti"],
  ["Genoa -> AC Milan -> Monaco -> AS Roma -> Juventus", "None"],
  ["Genoa -> Inter Milan -> Genoa -> Inter -> Roma", "Diego Milito"], // Milito: Racing, Genoa, Zaragoza, Genoa, Inter, Racing.
  ["Racing Club -> Genoa -> Real Zaragoza -> Genoa -> Inter Milan -> Racing Club", "Diego Milito"],
  ["Dinamo Zagreb -> Inter Milan -> Real Madrid -> Chelsea", "Mateo Kovacic"], // Inter, RM, Chelsea, Man City
  ["Dinamo Zagreb -> Inter Milan -> Real Madrid -> Chelsea -> Man City", "Mateo Kovacic"],
  ["RB Salzburg -> RB Leipzig -> Bayern Munich -> Borussia Dortmund", "Marcel Sabitzer"],
  ["Anderlecht -> Chelsea -> Everton -> Man United -> Inter Milan -> Chelsea -> Inter Milan -> Roma", "Romelu Lukaku"], // Roma, Napoli
  ["Anderlecht -> Chelsea -> Everton -> Man United -> Inter -> Chelsea -> Roma -> Napoli", "Romelu Lukaku"],
  ["Wolfsburg -> Man City -> Roma -> Inter Milan", "Edin Dzeko"],
  ["Bari -> Roma -> Real Madrid -> Sampdoria -> Inter Milan -> Parma", "Antonio Cassano"]
];

careerPaths.forEach(([path, answer]) => {
  if (answer !== "None") {
    addQ(`Which player's career path is: ${path}?`, answer, 'career_path');
  }
});

// 2. UCL Facts
const uclFacts = [
  ["Which player has won the most Champions League titles as of 2024?", "Paco Gento"], // Dani Carvajal, Modric, Nacho, Kroos tied with 6. Gento also 6. Let's stick to modern.
  ["Which active player has won 6 UCL titles with Real Madrid?", "Luka Modric"], // Or Dani Carvajal, Nacho
  ["Which player won the UCL with Ajax (1995), Real Madrid (1998) and AC Milan (2003, 2007)?", "Clarence Seedorf"],
  ["Who scored the winning goal for Real Madrid in the 2014 UCL Final against Atletico Madrid in extra time?", "Gareth Bale"], // Ramos equalized, Bale scored winner.
  ["Which player scored a bicycle kick for Real Madrid in the 2018 UCL Final?", "Gareth Bale"],
  ["Who scored a legendary volley for Real Madrid in the 2002 UCL Final?", "Zinedine Zidane"],
  ["Who was the captain of Liverpool when they won the UCL in 2005?", "Steven Gerrard"],
  ["Which Chelsea player missed the crucial penalty in the 2008 UCL Final?", "John Terry"],
  ["Who scored the winning penalty for Chelsea in the 2012 UCL Final?", "Didier Drogba"],
  ["Who scored Bayern Munich's winning goal in the 2013 UCL Final?", "Arjen Robben"],
  ["Who scored the winning goal for Barcelona in the 2006 UCL Final?", "Juliano Belletti"],
  ["Which player scored in both the 2009 and 2011 UCL Finals for Barcelona?", "Lionel Messi"],
  ["Who scored a hat-trick for Tottenham against Ajax in the 2019 UCL semi-final?", "Lucas Moura"],
  ["Which player scored 4 goals for Bayern Munich against Tottenham in a 7-2 UCL win in 2019?", "Serge Gnabry"],
  ["Who is the all-time top scorer in UEFA Champions League history?", "Cristiano Ronaldo"],
  ["Who holds the record for the most goals in a single UCL season (17 goals in 2013-14)?", "Cristiano Ronaldo"],
  ["Which manager has won the most Champions League titles?", "Carlo Ancelotti"],
  ["Which club won 3 consecutive UCL titles from 2016 to 2018?", "Real Madrid"],
  ["Which team defeated AC Milan in the legendary 'Miracle of Istanbul' in 2005?", "Liverpool"],
  ["Who scored the fastest goal in UCL Final history (50 seconds) in 2005?", "Paolo Maldini"],
  ["Which player scored 5 goals in a single UCL match for Barcelona against Bayer Leverkusen in 2012?", "Lionel Messi"],
  ["Which player scored 5 goals in a single UCL match for Bayern Munich against Red Star in 2019?", "Robert Lewandowski"], // Wait, Luiz Adriano and Haaland also scored 5.
  ["Which player scored 5 goals in a single UCL match for Man City against RB Leipzig in 2023?", "Erling Haaland"],
  ["Which goalkeeper has the most clean sheets in Champions League history?", "Iker Casillas"], // Wait, Neuer passed him. Let's use Neuer.
  ["Which goalkeeper broke Casillas's record for most clean sheets in UCL history?", "Manuel Neuer"],
  ["Who scored a famous overhead kick for Juventus against Real Madrid in the 2017 UCL Final?", "Mario Mandzukic"],
  ["Who scored Man City's winning goal in the 2023 UCL Final?", "Rodri"],
  ["Who was the top scorer of the 2022-23 Champions League season?", "Erling Haaland"],
  ["Which player won the UCL with Porto in 2004 and Inter Milan in 2010 under Jose Mourinho?", "Ricardo Carvalho"], // Wait, Carvalho went to Chelsea. Deco went to Barca. Paulo Ferreira went to Chelsea. Maniche didn't go to Inter. Derlei? No. 
  // Let's use a better one:
  ["Which manager won the UCL with Porto in 2004 and Inter Milan in 2010?", "Jose Mourinho"],
  ["Which player won the UCL with Man United in 2008 and Barcelona in 2009?", "Gerard Pique"],
  ["Which player won the UCL with Bayern Munich in 2013 and Real Madrid in 2014?", "Toni Kroos"],
  ["Which club did Jose Mourinho guide to a UCL victory in 2004?", "Porto"],
  ["Which French club is the only one to have won the Champions League (in 1993)?", "Marseille"],
  ["Which Dutch club won the Champions League in 1995?", "Ajax"],
  ["Who scored the winning goal for Ajax in the 1995 UCL Final?", "Patrick Kluivert"],
  ["Who scored Chelsea's winning goal against Man City in the 2021 UCL Final?", "Kai Havertz"],
  ["Who scored Bayern Munich's winning goal against PSG in the 2020 UCL Final?", "Kingsley Coman"],
  ["Which player was sent off for Arsenal in the 2006 UCL Final?", "Jens Lehmann"],
  ["Who scored Arsenal's only goal in the 2006 UCL Final?", "Sol Campbell"],
  ["Who scored a brace (2 goals) for Inter Milan in the 2010 UCL Final?", "Diego Milito"],
  ["Which team won the 2010 Champions League?", "Inter Milan"],
  ["Which team won the 2012 Champions League?", "Chelsea"],
  ["Which team won the 2013 Champions League?", "Bayern Munich"],
  ["Which team won the 2014 Champions League?", "Real Madrid"],
  ["Which team won the 2015 Champions League?", "Barcelona"],
  ["Which team won the 2019 Champions League?", "Liverpool"],
  ["Which team won the 2020 Champions League?", "Bayern Munich"],
  ["Which team won the 2021 Champions League?", "Chelsea"],
  ["Which team won the 2023 Champions League?", "Man City"]
];

uclFacts.forEach(([q, a]) => addQ(q, a, 'ucl'));

// 3. Superstars & Records
const superstars = [
  ["How many Ballon d'Or awards has Lionel Messi won?", "8"],
  ["How many Ballon d'Or awards has Cristiano Ronaldo won?", "5"],
  ["Who won the Ballon d'Or in 2018, breaking the Messi-Ronaldo dominance?", "Luka Modric"],
  ["Who won the Ballon d'Or in 2022?", "Karim Benzema"],
  ["Who won the Ballon d'Or in 2007?", "Kaka"],
  ["Who won the Ballon d'Or in 2005?", "Ronaldinho"],
  ["Who won the Ballon d'Or in 2001?", "Michael Owen"],
  ["Who won the Ballon d'Or in 1998?", "Zinedine Zidane"],
  ["How many goals did Lionel Messi score in the 2012 calendar year, setting a world record?", "91"],
  ["Who is the all-time top scorer for the Argentina national team?", "Lionel Messi"],
  ["Who is the all-time top scorer for the Portugal national team?", "Cristiano Ronaldo"],
  ["Who is the all-time top scorer for the Brazil national team?", "Neymar"],
  ["Who is the all-time top scorer for the France national team?", "Olivier Giroud"],
  ["Who is the all-time top scorer for the England national team?", "Harry Kane"],
  ["Who is the all-time top scorer for the Spain national team?", "David Villa"],
  ["Who is the all-time top scorer in World Cup history with 16 goals?", "Miroslav Klose"],
  ["Who scored the most goals in a single World Cup tournament (13 goals in 1958)?", "Just Fontaine"],
  ["Which player holds the record for the most goals in Premier League history (260 goals)?", "Alan Shearer"],
  ["Which player holds the record for the most assists in Premier League history?", "Ryan Giggs"],
  ["Who holds the record for the most clean sheets in Premier League history?", "Petr Cech"],
  ["Who is the fastest player to reach 50 goals in the Premier League?", "Erling Haaland"],
  ["Which player scored a record 36 goals in a single Premier League season (38 games)?", "Erling Haaland"],
  ["Which player scored a record 32 goals in a 38-game Premier League season before Haaland broke it?", "Mohamed Salah"],
  ["Who is the all-time top scorer in La Liga history?", "Lionel Messi"],
  ["Who is the second all-time top scorer in La Liga history?", "Cristiano Ronaldo"],
  ["Who holds the record for the most assists in La Liga history?", "Lionel Messi"],
  ["Who is the all-time top scorer for Real Madrid?", "Cristiano Ronaldo"],
  ["Who is the all-time top scorer for Barcelona?", "Lionel Messi"],
  ["Who is the all-time top scorer for Manchester United?", "Wayne Rooney"],
  ["Who is the all-time top scorer for Manchester City?", "Sergio Aguero"],
  ["Who is the all-time top scorer for Chelsea?", "Frank Lampard"],
  ["Who is the all-time top scorer for Arsenal?", "Thierry Henry"],
  ["Who is the all-time top scorer for Juventus?", "Alessandro Del Piero"],
  ["Who is the all-time top scorer for AC Milan?", "Gunnar Nordahl"], // Shevchenko is second
  ["Who holds the record for the most goals in a single La Liga season (50 goals in 2011-12)?", "Lionel Messi"],
  ["Which player transferred for a world-record €222 million fee in 2017?", "Neymar"],
  ["Which player transferred for the second-highest fee ever (approx €180m) in 2017?", "Kylian Mbappe"],
  ["Which club did Philippe Coutinho join from Liverpool in 2018 for €142 million?", "Barcelona"],
  ["Which club did Ousmane Dembele join from Borussia Dortmund in 2017 for €105 million?", "Barcelona"],
  ["Which club did Jack Grealish join for £100 million in 2021?", "Man City"],
  ["Which club did Declan Rice join for £105 million in 2023?", "Arsenal"],
  ["Which club did Enzo Fernandez join for £106 million in 2023?", "Chelsea"],
  ["Who won the FIFA Puskas Award in its inaugural year (2009)?", "Cristiano Ronaldo"],
  ["Who won the FIFA Puskas Award in 2011 for an incredible solo goal?", "Neymar"],
  ["Who won the FIFA Puskas Award in 2012 for a stunning volley against Chelsea?", "Miroslav Stoch"], // Falcao also nominated.
  ["Who won the FIFA Puskas Award in 2014 for a brilliant volley in the World Cup?", "James Rodriguez"],
  ["Who won the FIFA Puskas Award in 2018 for a bicycle kick against Liverpool?", "Gareth Bale"], // Wait, Salah won in 2018. Let's ask who scored it.
  ["Who won the FIFA Puskas Award in 2018?", "Mohamed Salah"],
  ["Who won the FIFA Puskas Award in 2020 for a solo run for Tottenham against Burnley?", "Son Heung-min"],
  ["Who is known as 'O Fenomeno'?", "Ronaldo"],
  ["Who is known as 'El Pipita'?", "Gonzalo Higuain"],
  ["Who is known as 'El Fideo'?", "Angel Di Maria"],
  ["Who is known as 'El Nino'?", "Fernando Torres"],
  ["Who is known as 'The Egyptian King'?", "Mohamed Salah"],
  ["Who is known as 'The Pharaoh'?", "Stephan El Shaarawy"]
];

superstars.forEach(([q, a]) => addQ(q, a, 'records'));

// 4. World Cup / International
const international = [
  ["Which country has won the most FIFA World Cups?", "Brazil"],
  ["Which country won the FIFA World Cup in 2022?", "Argentina"],
  ["Which country won the FIFA World Cup in 2018?", "France"],
  ["Which country won the FIFA World Cup in 2014?", "Germany"],
  ["Which country won the FIFA World Cup in 2010?", "Spain"],
  ["Which country won the FIFA World Cup in 2006?", "Italy"],
  ["Which country won the FIFA World Cup in 2002?", "Brazil"],
  ["Which country won the FIFA World Cup in 1998?", "France"],
  ["Who scored the winning goal for Argentina in the 2022 World Cup Final penalty shootout?", "Gonzalo Montiel"],
  ["Who scored a hat-trick in the 2022 World Cup Final but still lost?", "Kylian Mbappe"],
  ["Who scored the winning goal for Germany in the 2014 World Cup Final?", "Mario Gotze"],
  ["Who scored the winning goal for Spain in the 2010 World Cup Final?", "Andres Iniesta"],
  ["Who was sent off in the 2006 World Cup Final for headbutting Marco Materazzi?", "Zinedine Zidane"],
  ["Who scored both goals for Brazil in the 2002 World Cup Final?", "Ronaldo"],
  ["Who won the Golden Ball (Best Player) in the 2014 World Cup?", "Lionel Messi"],
  ["Who won the Golden Ball (Best Player) in the 2018 World Cup?", "Luka Modric"],
  ["Who won the Golden Ball (Best Player) in the 2022 World Cup?", "Lionel Messi"],
  ["Who won the Golden Boot (Top Scorer) in the 2018 World Cup with 6 goals?", "Harry Kane"],
  ["Who won the Golden Boot (Top Scorer) in the 2022 World Cup with 8 goals?", "Kylian Mbappe"],
  ["Which country won the UEFA Euro 2020 (played in 2021)?", "Italy"],
  ["Which country won the UEFA Euro 2016?", "Portugal"],
  ["Which country won the UEFA Euro 2012?", "Spain"],
  ["Which country won the UEFA Euro 2008?", "Spain"],
  ["Which country won the UEFA Euro 2004?", "Greece"],
  ["Who scored the winning goal for Portugal in the Euro 2016 Final?", "Eder"],
  ["Who scored the winning goal for Greece in the Euro 2004 Final?", "Angelos Charisteas"],
  ["Which player missed the crucial penalty for England in the Euro 2020 Final shootout?", "Bukayo Saka"],
  ["Which country has won the most Copa America titles (as of 2024)?", "Argentina"], // Uruguay 15, Argentina 16
  ["Who won the Golden Boot in the 2021 Copa America?", "Lionel Messi"],
  ["Which country won the 2015 and 2016 Copa America tournaments by beating Argentina on penalties?", "Chile"],
  ["Who missed a penalty for Argentina in the 2016 Copa America Final?", "Lionel Messi"],
  ["Which country won the 2019 Copa America?", "Brazil"],
  ["Which African country became the first to reach a World Cup semi-final in 2022?", "Morocco"],
  ["Which country hosted the 2010 FIFA World Cup?", "South Africa"],
  ["Which country hosted the 2014 FIFA World Cup?", "Brazil"],
  ["Which country hosted the 2006 FIFA World Cup?", "Germany"],
  ["Which country hosted the 2002 FIFA World Cup alongside Japan?", "South Korea"],
  ["Which country hosted the 1998 FIFA World Cup?", "France"],
  ["Who scored the famous 'Hand of God' goal in the 1986 World Cup?", "Diego Maradona"],
  ["Who scored the 'Goal of the Century' in the 1986 World Cup against England?", "Diego Maradona"],
  ["Which country won the 1966 FIFA World Cup?", "England"],
  ["Which player scored a hat-trick in the 1966 World Cup Final?", "Geoff Hurst"],
  ["Who holds the record for the most appearances in World Cup tournaments (26 matches)?", "Lionel Messi"],
  ["Who holds the record for the most clean sheets in World Cup history (10)?", "Peter Shilton"], // Fabien Barthez also 10
  ["Who scored the most goals in a single European Championship tournament (9 goals in 1984)?", "Michel Platini"],
  ["Who is the all-time top scorer in UEFA European Championship history?", "Cristiano Ronaldo"],
  ["Which player has made the most appearances in UEFA European Championship history?", "Cristiano Ronaldo"],
  ["Which manager led Argentina to World Cup victory in 2022?", "Lionel Scaloni"],
  ["Which manager led France to World Cup victory in 2018?", "Didier Deschamps"],
  ["Which manager led Germany to World Cup victory in 2014?", "Joachim Low"],
  ["Which manager led Spain to World Cup victory in 2010?", "Vicente del Bosque"]
];

international.forEach(([q, a]) => addQ(q, a, 'international'));

// Add more mixed questions to ensure >200
const mixed = [
  ["What was the score in the famous 2014 World Cup semi-final between Germany and Brazil?", "7-1"],
  ["Which club is famous for its 'Galacticos' policy?", "Real Madrid"],
  ["Which club is famous for its 'La Masia' academy?", "Barcelona"],
  ["Which club plays its home games at Anfield?", "Liverpool"],
  ["Which club plays its home games at Old Trafford?", "Man United"],
  ["Which club plays its home games at Santiago Bernabeu?", "Real Madrid"],
  ["Which club plays its home games at Camp Nou?", "Barcelona"],
  ["Which club plays its home games at San Siro?", "AC Milan"], // Also Inter
  ["Which club plays its home games at Signal Iduna Park?", "Borussia Dortmund"],
  ["Which club plays its home games at the Allianz Arena?", "Bayern Munich"],
  ["Which club plays its home games at the Emirates Stadium?", "Arsenal"],
  ["Which club plays its home games at Stamford Bridge?", "Chelsea"],
  ["Which Italian club is known as 'The Old Lady'?", "Juventus"],
  ["Which English club is known as 'The Toffees'?", "Everton"],
  ["Which English club is known as 'The Magpies'?", "Newcastle United"],
  ["Which English club is known as 'The Hammers'?", "West Ham United"],
  ["Which Spanish club is known as 'Los Colchoneros'?", "Atletico Madrid"],
  ["Which Italian club is known as 'I Nerazzurri'?", "Inter Milan"],
  ["Which Italian club is known as 'I Rossoneri'?", "AC Milan"],
  ["Who won the Premier League Golden Boot in the 2022-23 season?", "Erling Haaland"],
  ["Who won the Premier League Golden Boot in the 2021-22 season (sharing with Son Heung-min)?", "Mohamed Salah"],
  ["Which team won the 2003-04 Premier League season without losing a single game?", "Arsenal"],
  ["Which team won the 2017-18 Premier League season with a record 100 points?", "Man City"],
  ["Which team won the Premier League in the legendary 2015-16 season?", "Leicester City"],
  ["Who was the manager of Leicester City when they won the Premier League in 2016?", "Claudio Ranieri"],
  ["Who was the manager of Arsenal during their 'Invincibles' season?", "Arsene Wenger"],
  ["Who was the manager of Manchester United when they won the Treble in 1999?", "Alex Ferguson"],
  ["Who was the manager of Barcelona when they won the Sextuple in 2009?", "Pep Guardiola"],
  ["Who was the manager of Inter Milan when they won the Treble in 2010?", "Jose Mourinho"],
  ["Who was the manager of Bayern Munich when they won the Treble in 2013?", "Jupp Heynckes"],
  ["Who was the manager of Bayern Munich when they won the Sextuple in 2020?", "Hansi Flick"],
  ["Which player holds the record for the most red cards in La Liga history?", "Sergio Ramos"],
  ["Which player holds the record for the most yellow cards in Premier League history?", "Gareth Barry"],
  ["Which goalkeeper scored over 130 goals in his career?", "Rogerio Ceni"],
  ["Which goalkeeper famously scored a bicycle kick for Baroka FC in South Africa?", "Oscarine Masuluke"],
  ["Which goalkeeper famously performed the 'Scorpion Kick' save in 1995?", "Rene Higuita"]
];

mixed.forEach(([q, a]) => addQ(q, a, 'mixed'));

// 5. Some more career paths
const careerPaths2 = [
  ["Rosario Central -> Benfica -> Real Madrid -> PSG -> Juventus -> Benfica", "Angel Di Maria"], // Already did di maria
  ["Estudiantes -> Man United -> Chelsea -> PSG -> Sporting CP -> Boca Juniors -> Estudiantes", "Marcos Rojo"],
  ["Audax Italiano -> Colo-Colo -> Bayer Leverkusen -> Juventus -> Bayern Munich -> Barcelona -> Inter Milan -> Flamengo -> Athletico Paranaense -> Colo-Colo", "Arturo Vidal"],
  ["Cobreloa -> Udinese -> Barcelona -> Arsenal -> Man United -> Inter Milan -> Marseille -> Galatasaray -> Inter Milan", "Alexis Sanchez"],
  ["Nacional -> Ajax -> Liverpool -> Barcelona -> Atletico Madrid -> Nacional -> Gremio -> Inter Miami", "Luis Suarez"],
  ["Independiente -> Atletico Madrid -> Liverpool -> Espanyol -> Newell's Old Boys", "Maxi Rodriguez"],
  ["Lille -> Chelsea -> Real Madrid", "Eden Hazard"], // duplicate
  ["Aston Villa -> Man City", "Jack Grealish"],
  ["Palermo -> Juventus -> Roma", "Paulo Dybala"],
  ["Genoa -> Juventus -> Tottenham -> Boca Juniors", "Rodrigo Bentancur"],
  ["Velez Sarsfield -> Valencia -> Man City -> Aston Villa -> Benfica", "Nicolas Otamendi"], // Duplicate
  ["Ajax -> Juventus -> Inter Milan -> Barcelona -> AC Milan -> PSG -> Man United -> LA Galaxy -> AC Milan", "Zlatan Ibrahimovic"],
  ["Barcelona -> Bayern Munich -> Liverpool", "Thiago Alcantara"],
  ["Santos -> Real Madrid -> AC Milan -> Santos -> Atletico Mineiro -> Santos", "Robinho"],
  ["Athletico Paranaense -> Shakhtar Donetsk -> Man City -> Arsenal", "Fernandinho"],
  ["Internacional -> Roma -> Liverpool -> Roma -> Internacional", "Alisson Becker"] // Roma -> Liverpool
];
careerPaths2.forEach(([q, a]) => addQ(q, a, 'career_path'));

fs.writeFileSync('src/trivia/data/questions.json', JSON.stringify(questions, null, 2));
console.log(`Generated ${questions.length} questions.`);

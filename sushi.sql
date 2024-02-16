DROP TYPE IF EXISTS categ_sushi CASCADE;
DROP TYPE IF EXISTS tipuri_produse CASCADE;

CREATE TYPE categ_sushi AS ENUM( 'comanda speciala', 'traditional', 'editie limitata', 'comun');
CREATE TYPE tipuri_produse AS ENUM('restaurant', 'sushi bar','bubble tea');

DROP TABLE IF EXISTS sushi CASCADE;


CREATE TABLE IF NOT EXISTS public.sushi (
   id serial PRIMARY KEY,
   nume VARCHAR(50) UNIQUE NOT NULL,
   descriere TEXT,
   pret NUMERIC(8,2) NOT NULL,
   bucati INT NOT NULL CHECK (bucati>=0),
   tip_produs tipuri_produse DEFAULT 'sushi bar',
   calorii INT NOT NULL CHECK (calorii>=0),
   categorie public.categ_sushi DEFAULT 'comun',
   ingrediente VARCHAR [],
   vegetarian BOOLEAN NOT NULL DEFAULT FALSE,
   imagine VARCHAR(300),
   data_adaugare TIMESTAMP DEFAULT current_timestamp
);

INSERT into sushi (nume,descriere,pret, bucati, calorii, tip_produs, categorie, ingrediente, vegetarian, imagine) VALUES 
('Nigiri', 'Piesa tradiționă din bucătăria chinezească', 25, 4, 200, 'sushi bar', 'traditional', '{" orez"," somon"," alge marine"}', False, 'nigiri_traditionale.jpg'),

('Sashimi', 'Sushi cu peste crud si ridiche', 25 , 4, 150, 'sushi bar', 'traditional', '{" peste crud la alegere"," ridiche daikon"," sos de soia"}', False, 'sashimi_traditional.jpg'),

('Rulouri Maki', 'Clasica explozie de gust, cu somon, legume si alge marine', 20 , 6, 150, 'restaurant', 'comun', '{" somon"," avocado"," castravete"," morcov"," orez"," alge marine"}', False,'maki_rolls.jpg'),

('Uramaki', 'Sushi in stil occidental, care imbina gustul fresh al legumelor si al somonului cu savoarea cascavalului', 35 , 6, 250, 'sushi bar', 'editie limitata', '{" somon"," orez"," avocado"," susan"," cascaval"," castravete"}', False,'uramaki.jpg'),

('Temaki', 'Deliciu preparat manual, la comandă', 40 , 2, 350, 'restaurant', 'comanda speciala', '{" alge marine"," orez"," peste la alegere"," seminte de mac", " frunze de shiso"," takuan (ridiche daikon murata)"," muguri de ridiche"}', False,'Temaki.jpg'),

('Nimic', 'Nimic', 1 , 0, 0, 'restaurant', 'comun', '{}', True, 'nimic.jpg'),

('Rulouri Tempura', 'Toată savoarea unor rulouri Maki sau Uramaki, dar sub o crustă delicioasa!', 25 , 6, 400, 'restaurant', 'comun', '{" orez"," somon"," alge marine"," castravete"}', False, 'tempura_rolls.jpg'),

('Saba', 'Calitatea înaltă a macroului, pe un pat de orez aromat', 30 , 2, 350, 'sushi bar', 'editie limitata', '{" macrou marinat"," orez"," otet"}', False, 'saba.jpg'),

('Unagi', 'Popularul Nigiri, insa cu un plus de exclusivitate, stil si rafinament', 40 , 6, 400, 'restaurant', 'comanda speciala', '{" tipar"," orez"," alge marine"," susan"}', False, 'unagi.jpg'),

('Uni', 'Esti un cunoscator experimentat al artei Sushi? Incearca vestitul arici de mare, Uni! ', 40 , 2, 200, 'sushi bar', 'comanda speciala', '{" alge marine"," otet"," orez"," sos de soia"," wasabi"}', False, 'uni.jpg'),

('Chirashi', 'Ai vrea să împarți gustul nemaiîntâlnit al Sushi-ului si cu prietenii tăi? Încearcă Chirashi!', 50 , 10, 700, 'restaurant', 'traditional', '{" orez"," otet", " somon"," ton"," castravete"," icre"}', False, 'chirashi.jpg'),

('Oshinko Maki', 'Ai vrea să ai parte de delciile asiatice dar esti vegetarian sau pur și simplu nu-ți place peștele? Încearcă această rețetă specială cu ridiche murată Daikon', 25 , 6, 150, 'restaurant', 'comun', '{" ridiche Daikon"," orez"," alge marine"," castravete"," avocado"}', True, 'Oshinko_Maki.jpg'),

('Unagi Maki', 'Ești gata de un gust unic? Încearcă acest deliciu cu anghilă preparată ca la carte', 45 , 8, 600, 'sushi bar', 'comanda speciala', '{" anghila"," castravete"," orez", " alge marine"," sos de soia"}', False, 'unagi_maki.jpg'),

('Clasic Bubble Tea', 'Descoperă savoarea gustului care a cucerit planeta! Rețeta noastră de Bubble Tea este combinație perfectă de dulce și răcoritor!', 20 , 1, 200, 'bubble tea', 'comun', '{" ceai verde"," lapte"," boabe de tapioca", " zahar","gheata"}', True, 'clasic_bubble_tea.jpg'),

('Coffee Bubble Tea', 'Ai nevoie să te trezești într-un mod mai fun? Încearcă rețeta noastră de Bubble Tea cu un shot de espresso!', 25 , 1, 175, 'bubble tea', 'comanda speciala', '{" ceai verde"," lapte"," boabe de tapioca", " zahar"," gheata"," espresso"}', True, 'coffee_bubble_tea.jpg'),

('Fruits Bubble Tea', 'Încearcă bubble tea în multe forme perfecte pentru vară! Alege dintre afine, pepene roșu, kivi și banane!', 25 , 1, 225, 'bubble tea', 'editie limitata', '{" ceai verde"," lapte"," boabe de tapioca", " zahar"," gheata"," afine"," banane"," kivi"," pepene"}', True, 'bubble_tea_cu_fructe.jpg');

DROP TYPE IF EXISTS roluri CASCADE;

CREATE TYPE roluri AS ENUM('admin', 'moderator', 'comun');


DROP TABLE IF EXISTS utilizatori CASCADE;

CREATE TABLE IF NOT EXISTS utilizatori (
   id serial PRIMARY KEY,
   username VARCHAR(50) UNIQUE NOT NULL,
   nume VARCHAR(100) NOT NULL,
   prenume VARCHAR(100) NOT NULL,
   parola VARCHAR(500) NOT NULL,
   rol roluri NOT NULL DEFAULT 'comun',
   email VARCHAR(100) NOT NULL,
   culoare_chat VARCHAR(50) NOT NULL,
   data_adaugare TIMESTAMP DEFAULT current_timestamp,
   cod character varying(200),
   confirmat_mail boolean DEFAULT false
);

INSERT into utilizatori (username,nume,prenume, parola, rol, email, culoare_chat, cod,confirmat_mail) VALUES 
('admin', 'Sushi','Master' , '23592385jf234hedfgj234502fj2358','admin', 'sushi_master@gmail.com', 'blue','sushi-bubble-tea', True);


DROP TABLE IF EXISTS accesari CASCADE;

CREATE TABLE IF NOT EXISTS accesari (
   id serial PRIMARY KEY,
   ip VARCHAR(100) NOT NULL,
   user_id INT NULL REFERENCES utilizatori(id),
   pagina VARCHAR(500) NOT NULL,
   data_accesare TIMESTAMP DEFAULT current_timestamp
);
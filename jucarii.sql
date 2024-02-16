
DROP TABLE IF EXISTS jucarii CASCADE;


CREATE TABLE IF NOT EXISTS public.jucarii (
   id serial PRIMARY KEY,
   nume VARCHAR(70) NOT NULL,
   pret INT NOT NULL CHECK(pret>=0),
   varsta_minima INT NOT NULL CHECK(varsta_minima>0),
   culori VARCHAR [],
   data_adaugare TIMESTAMP DEFAULT current_timestamp
);

INSERT INTO jucarii(nume, pret, varsta_minima, culori)
VALUES ('minge', 20, 1, '{"rosu","verde","galben","roz"}'),
('ratusca', 5, 0, '{"galben","roz"}'),
('papusa', 47, 5, '{"roz","albastru"}'),
('chitaitoare',4,0, '{"galben","roz","albastru","rosu","verde"}'),
('ursulet',55, 4, '{"galben","alb"}'),
('pistol cu apa', 23, 10, '{"negru","roz"}'),
('disc', 12, 6, '{"alb","roz","albastru","galben","verde"}'),
('coarda', 27, 10, '{"negru","galben","albastru"}'),
('casuta', 120, 11, '{"rosu","galben","roz","verde","alb"}'),
('castel',255, 12, '{"negru","alb"}'),
('titirez', 18, 7,  '{"alb","galben","verde","roz","albastru"}'),
('cuburi', 34, 4, '{"albastru","rosu","galben","verde"}'),
('zar', 2 , 6,  '{"albastru","alb","roz"}'),
('masinuta', 28, 5, '{"albastru","alb","verde"}'),
('toba', 24, 9, '{"verde","galben","alb"}'),
('plastilina', 17, 8,  '{"alb","negru","galben","roz","albastru","rosu","verde"}'),
('margele', 11 , 10, '{"rosu","roz","alb"}'),
('minge de plus', 9 , 1, '{"alb","roz","albastru"}'),
('zornaitoare', 7 , 1, '{"rosu","roz","galben","verde"}');

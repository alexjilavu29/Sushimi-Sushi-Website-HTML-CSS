const express= require("express");
const fs=require('fs');
const sharp=require('sharp');
const ejs=require('ejs');
const {Client}= require("pg");
const path = require('path');
const sass=require('sass');
const formidable= require('formidable');
const crypto= require('crypto');
const nodemailer= require('nodemailer');
const session= require('express-session');
const xmljs = require('xml-js');
const request = require('request');
const html_to_pdf = require('html-pdf-node');
var QRCode = require('qrcode');
const helmet=require('helmet');
const juice=require('juice');


const obGlobal={
	obImagini:null,
	obErori:null, 
	emailServer:"sushi.sushimi.node@gmail.com",
    protocol:null,
    numeDomeniu:null, 
    port:8080,
    sirAlphaNum:""
};


// creare server
var app=express();

app.set("view engine","ejs");//ca sa putem folosi view-uri de tip ejs
console.log("__dirname: ",__dirname);//afisam calea proiectului


app.use(helmet.frameguard());//pentru a nu se deschide paginile site-ului in frame-uri


//pagini speciale pentru care cererile post nu se preiau cu formidable
app.use(["/produse_cos","/cumpara"],express.json({limit:'2mb'}));//obligatoriu de setat pt request body de tip json
//trec mai jos paginile cu cereri post pe care vreau sa le tratez cu req.body si nu cu formidable
app.use(["/contact"], express.urlencoded({extended:true}));

//crearea sesiunii (obiectul de tip request capata proprietatea session si putem folosi req.session)
app.use(session({
    secret: 'abcdefg',//folosit de express session pentru criptarea id-ului de sesiune
    resave: true,
    saveUninitialized: false
  }));

  




///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// setam pentru toate cererile ca in locals sa avem campul utilizator cu valoarea preluata din datele salvate in sesiune
//obiectul req.session.utilizator a fost creat cand utilizatorul a facut cerere catre /login

app.use("/resurse",express.static(__dirname+"/resurse"));

app.use("/*", function(req,res,next){
    res.locals.utilizator=req.session.utilizator;
    res.locals.mesajLogin=req.session.mesajLogin;
    req.session.mesajLogin=null;
    //TO DO de adaugat vectorul de optiuni pentru meniu (sa se transmita pe toate paginile)
    next();
});



app.get("/api", (req, res) => {
    res.json({ message: "Ceva" });
});

app.get("/eroare", function(req, res){
    randeazaEroare(res,1, "Titlu schimbat");

});


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// pentru a verifica daca suntem pe Heroku sau in localhost
//intai va logati pe Heroku, intrati pe pagina aplicatiei din Heroku (nu pe site-ul vostru ci pe pagina cu detalii despre aplicatie)
//cautati tabul cu Settings si faceti click, cautati mai jos in pagina butonul "Reveal Config Vars" si click pe el
//se va afisa un fel de tabel cu 2 coloane: numele variabilei si valoarea. Creati variabila SITE_ONLINE cu valoarea true
var client; //folosit pentru conexiunea la baza de date
if(process.env.SITE_ONLINE){
      protocol="https://";
      numeDomeniu="https://quiet-wave-95567.herokuapp.com/"//atentie, acesta e domeniul pentru aplicatia mea; voi trebuie sa completati cu datele voastre
      client=new Client({ 
          user: 'soemfsumyhppnw', 
          password:'0d05f791709d6def1e817df9f58748dc1e70c0db1ef218d8a3b6a3caed33a357', 
          database:'d5847674ur0gve', host:'ec2-34-198-186-145.compute-1.amazonaws.com', port:5432,
          ssl: {
              rejectUnauthorized: false
            } });

  }
  else{
      client=new Client({ user: 'postgres', password:'Alex@908', database:'bd_sushimi', host:'localhost', port:5432 });
      protocol="http://";
      numeDomeniu="localhost:8080";
  }
  
  client.connect();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//crearea vectorului de optiuni, global pentru a putea fi folosit in orice cerere

var v_optiuni=[];
client.query("select * from unnest(enum_range(null::categ_sushi))", function(errCateg, rezCateg){
    
    for(let elem of rezCateg.rows){
        v_optiuni.push(elem.unnest);
    }
    //console.log(v_optiuni);
    
})  

var v_tipuri=[];
client.query("select * from unnest(enum_range(null::tipuri_produse))", function(errCateg, rezCateg){
    
    for(let elem of rezCateg.rows){
        v_tipuri.push(elem.unnest);
    }
    console.log(v_tipuri);
}) 

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////// Resetare folder imagini qr-code 
cale_qr="./resurse/imagini/qrcode";
if (fs.existsSync(cale_qr))
  fs.rmSync(cale_qr, {force:true, recursive:true});
fs.mkdirSync(cale_qr);
client.query("select id from sushi", function(err, rez){
    for(let prod of rez.rows){
        let cale_prod=protocol+numeDomeniu+"/produs/"+prod.id;
        //console.log(cale_prod);
        QRCode.toFile(cale_qr+"/"+prod.id+".png",cale_prod);
    }
});
cale_qr="./resurse/imagini/qrcode";
if (fs.existsSync(cale_qr))
  fs.rmSync(cale_qr, {force:true, recursive:true});
fs.mkdirSync(cale_qr);
client.query("select id from jucarii", function(err, rez){
    for(let juc of rez.rows){
        let cale_juc=protocol+numeDomeniu+"/jucarie/"+juc.id;
        //console.log(cale_juc);
        QRCode.toFile(cale_qr+"/"+juc.id+".png",cale_juc);
    }
});




/////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////Utilizatori online 




//am schimbat un pic fata de ce am explicat la curs, in loc de vectorul cu ip_uri blocate am folosit un obiect cu ipurile active
//ip-uri active= cele care au facut o cerere de curand
var ipuri_active={};


app.use("/*",function(req,res,next){
    let ipReq=getIp(req);
    let ip_gasit=ipuri_active[ipReq+"|"+req.url];
    //console.log("=================", ip_gasit, ipuri_blocate);
    timp_curent=new Date();
    if(ip_gasit){
    
        if( (timp_curent-ip_gasit.data)< 5*1000) {//diferenta e in milisecunde; verific daca ultima accesare a fost pana in 10 secunde
            if (ip_gasit.nr>10){//mai mult de 10 cereri 
                res.send("<h1>Eroare: Prea multe cereri intr-un interval scurt.</h1>");
                ip_gasit.data=timp_curent
                return;
            }
            else{  
                
                ip_gasit.data=timp_curent;
                ip_gasit.nr++;
            }
        }
        else{
            //console.log("Resetez: ", req.ip+"|"+req.url, timp_curent-ip_gasit.data)
            ip_gasit.data=timp_curent;
            ip_gasit.nr=1;//a trecut suficient timp de la ultima cerere; resetez
        }
    }
    else{

        //nu mai folosesc baza de date fiindca e prea lenta
        //var queryIp=`select ip, data_accesare from accesari where (now() - data_accesare < interval '00:00:05' ) and ip='${req.ip}' and pagina='${req.url}' `;
        //console.log(queryIp);
        /*
        client.query(queryIp, function(err,rez){
            //console.log(err, rez);
            if (!err){
                if(rez.rowCount>4)
                    {res.send("<h1>Ia te rog sa fii cuminte, da?!</h1>");
                    let ip_gasit=ipuri_blocate.find(function(elem){ return elem.ip==req.ip});
                    if(!ip_gasit)
                        ipuri_blocate.push({ip:req.ip, data:new Date()});
                    //console.log("ipuri_blocate: ",ipuri_blocate);
                    return;
                    }
        */
        ipuri_active[ipReq+"|"+req.url]={nr:1, data:timp_curent};
        //console.log("am adaugat ", req.ip+"|"+req.url);
        //console.log(ipuri_active);
        

    }
    let comanda_param= `insert into accesari(ip, user_id, pagina) values ($1::text, $2,  $3::text)`;
    //console.log(comanda);
    if (ipReq){
        var id_utiliz=req.session.utilizator?req.session.utilizator.id:null;
        //console.log("id_utiliz", id_utiliz);
        client.query(comanda_param, [ipReq, id_utiliz, req.url], function(err, rez){
            if(err) console.log(err);
        });
    }
    next();   
}); 

function stergeAccesariVechi(){
    let comanda= `delete from accesari where now() - data_accesare > interval '10 minutes'`;
    //console.log(comanda);
    client.query(comanda, function(err, rez){
        if(err) console.log(err);
    });
    
}


function stergeIpuriBlocate(){
    let timp_curent=new Date();
    for( let ipa in ipuri_active){
        if (timp_curent-ipuri_active[ipa].data>2*60*1000){ // daca sunt mai vechi de 2 minute le deblochez
            console.log("Am deblocat.", ipa);
            delete ipuri_active[ipa];
        }
    }
}
stergeAccesariVechi();
setInterval(stergeAccesariVechi,10*60*1000);
setInterval(stergeIpuriBlocate,2*60*1000);










//////////////////////////////////////////////////////////////////////////////////////////////////
// setarea folderelor statice de resurse; TO DO cel de poze_uploadate






///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////  Afisarea produselor (grup si individual)

app.get("/produse", function(req, res){
    var conditie=""
    if(req.query.tip)
        conditie+=` and tip_produs='${req.query.tip}'`;
    client.query(`select * from sushi where 1=1 ${conditie}`, function(err,rez){
        
        if (!err){
            //console.log(rez);
            client.query("select * from unnest(enum_range(null::categ_sushi))", function(errCateg, rezCateg){
                
                v_optiuni=[];
                for(let elem of rezCateg.rows){
                    v_optiuni.push(elem.unnest);
                }
                //console.log(v_optiuni);
                res.render("pagini/produse",{produse:rez.rows, optiuni:v_optiuni});
            })
            
        }
        else{//TO DO 
            console.log(err);
        }
    })
})

app.get("/produse", function(req, res){
    var conditie=""
    if(req.query.tip)
        conditie+=` and tip_produs='${req.query.tip}'`;
    client.query(`select * from sushi where 1=1 ${conditie}`, function(err,rez){
        
        if (!err){
            //console.log(rez);
            client.query("select * from unnest(enum_range(null::tipuri_produse))", function(errCateg, rezCateg){
                
                v_tipuri=[];
                for(let elem of rezCateg.rows){
                    v_tipuri.push(elem.unnest);
                }
                //console.log(v_optiuni);
                res.render("pagini/produse",{produse:rez.rows, tipuri:v_tipuri});
            })
            
        }
        else{//TO DO 
            console.log(err);
        }
    })
})


app.get("/produs/:id", function(req, res){
    //console.log(req.params)
    client.query(`select * from sushi where id=${req.params.id}`, function(err,rez){
        if (!err){
            
            res.render("pagini/produs",{prod:rez.rows[0]});
        }
        else{//TO DO 
            console.log(err);
        }
    })
})



app.get("/jucarii", function(req, res){
    client.query(`select * from jucarii`, function(err,rez){
        console.log(err)        
        res.render("pagini/jucarii",{jucarii:rez.rows});
    })
})


app.get("/jucarie/:id", function(req, res){
    //console.log(req.params)
    client.query(`select * from jucarii where id=${req.params.id}`, function(err,rez){
            console.log(err)
            res.render("pagini/jucarie",{juc:rez.rows[0]});
    
    })
})

//////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////Facturare si cos virtual

/*
Daca aveti probleme cu crearea facturii si va da o eroare legata de pachetul puppeteer (este folsit de html-pdf-node pentru a crea pdf-uri) realizati urmatoarele:
1) Instalam plug-in-ul heroku-builds cu comanda:
 heroku plugins:install heroku-builds
2) Stergeti cache-ul de la buildul anterior cu 
 heroku builds:cache:purge -a [nume aplicatie]
3) adaugati in setarile pentru aplicatie, la buildpacks https://github.com/jontewks/puppeteer-heroku-buildpack cu comanda:
heroku buildpacks:add --index 1 https://github.com/jontewks/puppeteer-heroku-buildpack -a [nume aplicatie]

*/

async function trimitefactura(username, email,numefis){
	var transp= nodemailer.createTransport({
		service: "gmail",
		secure: false,
		auth:{//date login 
			user:"sushi.sushimi.node@gmail.com",
			//pass:"tehniciweb"
            pass:"rwgmgkldxnarxrgu"
		},
		tls:{
			rejectUnauthorized:false
		}
	});
	//genereaza html
	await transp.sendMail({
		from:"sushi.sushimi.node@gmail.com",
		to:email,
		subject:"Factură",
		text:"Stimate "+username+", aveți atașată factura",
		html:"<h1>Salut!</h1><p>Stimate "+username+", aveți atașată factura</p>",
        attachments: [
            {   // utf-8 string as an attachment
                filename: 'factura.pdf',
                content: fs.readFileSync(numefis)
            }
        ]
	})
	console.log("trimis mail");
}







app.post("/produse_cos",function(req, res){
    
	//console.log("req.body: ",req.body);
    //console.log(req.get("Content-type"));
    //console.log("body: ",req.get("body"));

    /* prelucrare pentru a avea toate id-urile numerice si pentru a le elimina pe cele care nu sunt numerice */
    var iduri=[]
    for (let elem of req.body.ids_prod){
        let num=parseInt(elem);
        if (!isNaN(num))//daca este numar
            iduri.push(num);
    }
    if (iduri.length==0){
        res.send("eroare");
        return;
    }

    //TO DO de facut verificari pe id-uri

    //console.log("select id, nume, pret, bucati, calorii, categorie, imagine from sushi where id in ("+iduri+")");
    client.query("select id, nume, pret, bucati, calorii, categorie, imagine from sushi where id in ("+iduri+")", function(err,rez){
        //console.log(err, rez);
        //console.log(rez.rows);
        res.send(rez.rows);
       
       
    });

    
});


app.post("/cumpara",function(req, res){
    if(!req.session.utilizator){
        res.write("Nu puteti cumpara daca nu sunteti logat!");res.end();
        return;
    }
    //TO DO verificare id-uri pentru query-ul la baza de date
    console.log("select id, nume, pret, bucati, calorii, categorie, imagine from sushi where id in ("+req.body.ids_prod+")");
    client.query("select id, nume, pret, bucati, calorii, categorie, imagine from sushi where id in ("+req.body.ids_prod+")", function(err,rez){
        //console.log(err, rez);
        //console.log(rez.rows);
        
        let rezFactura=ejs.render(fs.readFileSync("views/pagini/factura.ejs").toString("utf8"),{utilizator:req.session.utilizator,produse:rez.rows, protocol:protocol, domeniu:numeDomeniu});
        //console.log(rezFactura);
        let options = { format: 'A4', args: ['--no-sandbox', '--disable-extensions',  '--disable-setuid-sandbox'] };

        let file = { content: juice(rezFactura, {inlinePseudoElements:true}) };
       
        html_to_pdf.generatePdf(file, options).then(function(pdf) {
            if(!fs.existsSync("./temp"))
                fs.mkdirSync("./temp");
            var numefis="./temp/test"+(new Date()).getTime()+".pdf";
            fs.writeFileSync(numefis,pdf);
            trimitefactura(req.session.utilizator.username, req.session.utilizator.email, numefis);
            res.write("Totu bine!");res.end();
        });
       
        
       
    });

    
});



//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////// Pagina - exemplu generata fara un view - am folosit-o pentru a testa diverse lucruri

app.get("/ceva",function(req,res){
    console.log("Am primit o cerere");
    if(req.session.utilizator)
        res.write("<p style='color:red'>"+req.session.utilizator.username+" "+req.session.utilizator.prenume+"</p>");
    else
        res.write("<p>Nu esti logat!</p>");
    res.end();
});



//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////// Functii necesare pentru galeria de imagini 

function creeazaImagini(){
    var buf=fs.readFileSync(__dirname+"/resurse/json/galerie.json").toString("utf8");
    obGlobal.obImagini=JSON.parse(buf);//global
    //console.log(obGlobal.obImagini);
    for (let imag of obGlobal.obImagini.imagini){
        let nume_imag, extensie;
        if(typeof imag.fisier === 'string'){
        [nume_imag, extensie]=imag.fisier.split(".");// "abc.de".split(".") ---> ["abc","de"]
        let dim_mic=150;
        
        imag.mic=`${obGlobal.obImagini.cale_galerie}/mic/${nume_imag}-${dim_mic}.webp` ;//nume-150.webp // "a10" b=10 "a"+b `a${b}`
        //console.log(imag.mic);
        imag.mare=`${obGlobal.obImagini.cale_galerie}/${imag.fisier}`;
        if (!fs.existsSync(imag.mic))
            sharp(__dirname+"/"+imag.mare).resize(dim_mic).toFile(__dirname+"/"+imag.mic);

        }
        else
        {
            console.log('imag.fisier nu este un sir de caractere');
          }
    }

}
creeazaImagini();

app.get("*/galerie-animata.css.map",function(req, res){
    res.sendFile(path.join(__dirname,"temp/galerie-animata.css.map"));
});



app.get("*/galerie-animata.css",function(req, res){
    /*Atentie modul de rezolvare din acest app.get() este strict pentru a demonstra niste tehnici
    si nu pentru ca ar fi cel mai eficient mod de rezolvare*/
    let sirScss=fs.readFileSync("./resurse/scss/galerie_animata.scss").toString("utf8");//citesc scss-ul cs string
    culori=["navy","black","purple","grey"]
    let culoareAleatoare =culori[Math.floor(Math.random()*culori.length)];//iau o culoare aleatoare pentru border
	//console.log(culoareAleatoare);
    //let nrImag= 10+Math.floor(Math.random()*5)*2;  //Math.floor(Math.random()*10) 
    let rezScss=ejs.render(sirScss,{culoare:culoareAleatoare});// transmit culoarea catre scss si obtin sirul cu scss-ul compilat
    //console.log(rezScss);
    fs.writeFileSync("./temp/galerie-animata.scss",rezScss);//scriu scss-ul intr-un fisier temporar

	let cale_css=path.join(__dirname,"temp","galerie-animata.css");//__dirname+"/temp/galerie-animata.css"
	let cale_scss=path.join(__dirname,"temp","galerie-animata.scss");
	/*sass.render({file: cale_scss, sourceMap:true}, function(err, rezCompilare) {
		console.log(rezCompilare);
		if (err) {
            console.log(`eroare: ${err.message}`);
            //to do: css default
            res.end();//termin transmisiunea in caz de eroare
            return;
        }
		fs.writeFileSync(cale_css, rezCompilare.css, function(err){
			if(err){console.log(err);}
		});
		res.sendFile(cale_css);
	});*/

    try{
        rezCompilare=sass.compile(cale_scss,{sourceMap:true});
        fs.writeFileSync(cale_css, rezCompilare.css);
        
        res.setHeader("Content-Type","text/css");//pregatesc raspunsul de tip css
        res.sendFile(cale_css);
    }
    catch (err){
        console.log(`eroare: ${err.message}`);
        //to do: css default
        res.end();//termin transmisiunea in caz de eroare
        return;

    }
	//varianta cu pachetul sass

});


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////// Prima pagina
function getIp(req){//pentru Heroku
    var ip = req.headers["x-forwarded-for"];//ip-ul userului pentru care este forwardat mesajul
    if (ip){
        let vect=ip.split(",");
        return vect[vect.length-1];
    } 
    else if (req.ip){
        return req.ip;
    }
    else{
     return req.connection.remoteAddress;
    }
}


app.get(["/","/index","/home"], function(req,res){
    var rezultat;
    client.query("select username, nume from utilizatori where id in (select distinct user_id from accesari where now() - data_accesare < interval '5 minutes' )").then(function(rezultat){
        console.log("rezultat", rezultat.rows);
        var evenimente=[]
        var locatie="";
        
        request(req.ip, //se inlocuieste cu req.ip; se testeaza doar pe Heroku
            function (error, response, body) {
            if(error) {console.error('error:', error)}
            else{
                var obiectLocatie=JSON.parse(body);
                //console.log(obiectLocatie);
                locatie=obiectLocatie.geobytescountry+" "+obiectLocatie.geobytesregion
            }

            //generare evenimente random pentru calendar 
            
            var texteEvenimente=["Eveniment important", "Festivitate", "sushi gratis", "Zi cu soare", "Aniversare"];
            dataCurenta=new Date();
            for(i=0;i<texteEvenimente.length;i++){
                evenimente.push({data: new Date(dataCurenta.getFullYear(), dataCurenta.getMonth(), Math.ceil(Math.random()*27) ), text:texteEvenimente[i]});
            }
            console.log(evenimente)
            console.log("inainte",req.session.mesajLogin);
            res.render("pagini/index", {evenimente: evenimente, locatie:locatie,utiliz_online: rezultat.rows, ip:getIp(req),imagini:obGlobal.obImagini.imagini, cale:obGlobal.obImagini.cale_galerie});
            //req.session.mesajLogin="abc";
            req.session.a="ceva";
            
            console.log("dupa",req.session.mesajLogin);
            
            });
            
        //res.render("pagini/index", {evenimente: evenimente, locatie:locatie,utiliz_online: rezultat.rows, ip:req.ip,imagini:obGlobal.obImagini.imagini, cale:obGlobal.obImagini.cale_galerie, mesajLogin:req.session.mesajLogin});
             
    }, function(err){console.log("eroare",err)});

    
   // res.render("pagini/index",{ip:req.ip, imagini:obGlobal.obImagini.imagini, cale:obGlobal.obImagini.cale_galerie});//calea relativa la folderul views
});









////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////// Administrarea utilizatorilor (inregistrare, login, logout, update profil)

sirAlphaNum="";
v_intervale=[[48,57],[65,90],[97,122]];
for (let interval of v_intervale){
    for (let i=interval[0];i<=interval[1];i++)
        sirAlphaNum+=String.fromCharCode(i);
}
console.log("sirAlphaNum: ",sirAlphaNum);



function genereazaToken(lungime){
    sirAleator="";//acesta o sa fie tokenul
    for(let i=0;i<lungime; i++){
        sirAleator+= sirAlphaNum[ Math.floor( Math.random()* sirAlphaNum.length) ];// 0<= length*x < length
    }
    return sirAleator
}


/*
Pentru task trebuie sa folositi o adresa de gmail creata de voi! Nu folositi cea data la curs fiindca parola e cunoscuta de toti si oricine o poate modifica
Nu folositi o adresa de gmail reala ci faceti una speciala pentru proiect!!!!!!
Pentru a pute folosi adresa de gmail trebuie sa :
1) Mergeti Pe pagina de Google Account (Manage google account). Alegeti tabul security (in dreapta). Setati Less Secure App Access pe "On"
2) Accesati https://accounts.google.com/b/0/DisplayUnlockCaptcha si dati click pe Continue - 
- uneori DisplayUnlockCaptcha se reseteaza si trebuie sa intrati din nou pe link daca vedeti ca nu merge trimiterea mailului. Problema e de la Heroku care schimba ip-ul fiindca folosim o versiune free

*/

async function trimiteMail(username, email, token){
	var transp= nodemailer.createTransport({
		service: "gmail",
		secure: false,
		auth:{//date login 
			user:"sushi.sushimi.node@gmail.com",
			//pass:"tehniciweb"
            pass:"rwgmgkldxnarxrgu"
		},
		tls:{
			rejectUnauthorized:false
		}
	});
	//genereaza html
	await transp.sendMail({
		from:"sushi.sushimi.node@gmail.com",
		to:email,
		subject:"V-ați înregistrat cu succes.",
		text:"Username-ul dumneavoastră este "+username,
		html:`<h1>Bună!</h1><p style='color:blue'>Username-ul tău este ${username}.</p> <p><a href='http://${numeDomeniu}/cod/${username}/${token}'>Click aici pentru confirmare.</a></p>`,
	})
	console.log("trimis mail");
}


//Este un salt (string) folosit pentru criptarea parolelor din tabelul de utilizatori:
parolaCriptare="curs_tehnici_web";



//Tratarea linkurilor de confirmare a contului, trimise pe mail. Un link de confirmare arata cam asa:
//http://localhost:8080/cod/prof68847/ITuZgIuj42z9067uqTfs69JjOM6wJWBS1c4fQzoKwgrfQfTTaMpsB6kS0yjD4TKlzSKL1wWjR7VWUyqAkjZyRejDcfxcpFVTHZSV

app.get("/cod/:user/:token", function(req,res){
    var queryUpdate=`update utilizatori set confirmat_mail=true where username = '${req.params.user}' and cod= '${req.params.token}' `;
    client.query(queryUpdate, function(err, rez){
        if (err){
            console.log(err);
            randeazaEroare(res, 2);
            return;
        }
        if (rez.rowCount>0){
            res.render("pagini/confirmare");
        }
        else{
            randeazaEroare(res, 2, "Eroare link confirmare.", "Nu e username-ul sau link-ul corect!");
        }
    });

});

app.post("/inreg", function(req, res){
    var formular= new formidable.IncomingForm();
    var username;
    formular.parse(req,function(err, campuriText, campuriFile){//4
        console.log(campuriText);
        console.log("Email: ", campuriText.email);
        //verificari - TO DO
        
        var eroare="";
        if (!campuriText.username)
            eroare+="Username-ul nu poate fi necompletat. ";
        //TO DO - de completat pentru restul de campuri required

        if ( !campuriText.username.match("^[A-Za-z0-9]+$"))
            eroare+="Username-ul trebuie sa contina doar litere mici/mari si cifre. ";
        //TO DO - de completat pentru restul de campuri functia match

        if (eroare!=""){
            res.render("pagini/inregistrare",{err:eroare});
            return;
        }

        queryVerifUtiliz=` select * from utilizatori where username= '${campuriText.username}' `;
        console.log(queryVerifUtiliz)
        
        client.query(queryVerifUtiliz, function(err, rez){
            if (err){
                console.log(err);
                res.render("pagini/inregistrare",{err:"Eroare baza date"});
            }
            
            else{
                if (rez.rows.length==0){

                    var criptareParola=crypto.scryptSync(campuriText.parola,parolaCriptare,32).toString('hex');
                    var token=genereazaToken(100);
                    var queryUtiliz=`insert into utilizatori (username, nume, prenume, parola, email, culoare_chat, cod) values ('${campuriText.username}','${campuriText.nume}','${campuriText.prenume}', $1 ,'${campuriText.email}','${campuriText.culoareText}','${token}')`; 
                
                    console.log(queryUtiliz, criptareParola);
                    client.query(queryUtiliz, [criptareParola], function(err, rez){ //TO DO parametrizati restul de query
                        if (err){
                            console.log(err);
                            res.render("pagini/inregistrare",{err:"Eroare baza date"});
                        }
                        else{
                            trimiteMail(campuriText.username,campuriText.email, token);
                            res.render("pagini/inregistrare",{err:"", raspuns:"Date introduse"});
                        }
                    });
                }
                else{
                    eroare+="Username-ul exista deja. ";
                    res.render("pagini/inregistrare",{err:eroare});
                }
            }
        });
    }); 
    formular.on("field", function(nume,val){  // 1 pentru campuri cu continut de tip text (pentru inputuri de tip text, number, range,... si taguri select, textarea)
        console.log("----> ",nume, val );
        if(nume=="username")
            username=val;
    }) 
    formular.on("fileBegin", function(nume,fisier){ //2
        if(!fisier.originalFilename)
            return;
        folderUtilizator=__dirname+"/poze_uploadate/"+username+"/";
        console.log("----> ",nume, fisier);
        if (!fs.existsSync(folderUtilizator)){
            fs.mkdirSync(folderUtilizator);
            v=fisier.originalFilename.split(".");
            fisier.filepath=folderUtilizator+"poza."+v[v.length-1];//setez calea de upload
            //fisier.filepath=folderUtilizator+fisier.originalFilename;
        }
        
    })    
    formular.on("file", function(nume,fisier){//3
        //s-a terminat de uploadat
        console.log("fisier uploadat");
    });        
});
app.post("/uitat", function(req, res){
    var formular= new formidable.IncomingForm();
    var username;
    formular.parse(req,function(err, campuriText, campuriFile){//4
        console.log(campuriText);
        console.log("Email: ", campuriText.email);

    }); 
             
});
app.post("/login", function(req, res){
    console.log("a intrat in login");
    var formular= new formidable.IncomingForm();

    formular.parse(req,function(err, campuriText, campuriFile){
        console.log(campuriText);
        
        var querylogin=`select * from utilizatori where username= '${campuriText.username}' `;
        client.query(querylogin, function(err, rez){
            if(err){
                res.render("pagini/eroare",{mesaj:"Eroare la baza de date. Încercați mai târziu."});
                return;
            }
            if (rez.rows.length!=1){//ar trebui sa fie 0
                res.render("pagini/eroare",{mesaj:"Username-ul nu există."});
                return;
            }
            var criptareParola=crypto.scryptSync(campuriText.parola,parolaCriptare,32).toString('hex'); 
            console.log(criptareParola);
            console.log(rez.rows[0].parola);
            if (criptareParola == rez.rows[0].parola && rez.rows[0].confirmat_mail){
                console.log("totul ok");
                req.session.mesajLogin=null;//resetez in caz ca s-a logat gresit ultima oara
                if(req.session){
                    req.session.utilizator={
                        id:rez.rows[0].id,
                        username:rez.rows[0].username,
                        nume:rez.rows[0].nume,
                        prenume:rez.rows[0].prenume,
                        culoare_chat:rez.rows[0].culoare_chat,
                        email:rez.rows[0].email,
                        rol:rez.rows[0].rol
                    }
                }
                // res.render("pagini"+req.url);
                res.redirect("/index");
            }
            else{
                req.session.mesajLogin="Login eșuat (Verificați dacă ați confirmat pe mail contul!).";
                res.redirect("/index");
                //res.render("pagini/index",{ip:req.ip, imagini:obGlobal.obImagini.imagini, cale:obGlobal.obImagini.cale_galerie,mesajLogin:"Login esuat"});
            }

        });
        

    });
});

app.post("/profil", function(req, res){
    console.log("profil");
    if (!req.session.utilizator){
        res.render("pagini/eroare",{mesaj:"Nu sunteți logat."});
        return;
    }
    var formular= new formidable.IncomingForm();

    formular.parse(req,function(err, campuriText, campuriFile){
        console.log(err);
        console.log(campuriText);
        var criptareParola=crypto.scryptSync(campuriText.parola,parolaCriptare,32).toString('hex'); 

        //toti parametrii sunt cu ::text in query-ul parametrizat fiindca sunt stringuri (character varying) in tabel
        var queryUpdate=`update utilizatori set nume=$1::text, prenume=$2::text, email=$3::text, culoare_chat=$4::text where username= $5::text and parola=$6::text `;
        
        client.query(queryUpdate, [campuriText.nume, campuriText.prenume, campuriText.email, campuriText.culoareText, req.session.utilizator.username, criptareParola], function(err, rez){
            if(err){
                console.log(err);
                res.render("pagini/eroare",{mesaj:"Eroare la baza de date. Încercați mai târziu."});
                return;
            }
            console.log(rez.rowCount);
            if (rez.rowCount==0){
                res.render("pagini/profil",{mesaj:"Update-ul nu s-a realizat. Verificați parola introdusă."});
                return;
            }
            
            req.session.utilizator.nume=campuriText.nume;
            req.session.utilizator.prenume=campuriText.prenume;
            
            req.session.utilizator.culoare_chat=campuriText.culoareText;
            req.session.utilizator.email=campuriText.email;

            res.render("pagini/profil",{mesaj:"Update-ul s-a realizat cu succes."});

        });
        

    });
});


app.get("/logout",function(req,res){
    req.session.destroy();
    res.locals.utilizator=null;
    res.render("pagini/logout");
});


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////// Pagini/cereri pentru admin

app.get('/useri', function(req, res){
	
	if( req.session && req.session.utilizator && req.session.utilizator.rol=="admin" ){
        client.query("select * from utilizatori",function(err, rezultat){
            if(err) throw err;
            //console.log(rezultat);
            res.render('pagini/useri',{useri:rezultat.rows});//afisez index-ul in acest caz
        });
	} 
    else{
		//res.status(403).render('pagini/eroare',{mesaj:"Nu aveti acces"});
        randeazaEroare(res,403);
	}
    
});




app.post("/sterge_utiliz",function(req, res){
	if( req.session && req.session.utilizator && req.session.utilizator.rol=="admin"  ){
	var formular= new formidable.IncomingForm()
	
	formular.parse(req, function(err, campuriText, campuriFisier){
		//var comanda=`delete from utilizatori where id=${campuriText.id_utiliz} and rol!='admin'`;
        var comanda=`delete from utilizatori where id=$1 and rol !='admin' and nume!= $2::text `;
		client.query(comanda, [campuriText.id_utiliz,"Mihai"] ,  function(err, rez){
			// TO DO mesaj cu stergerea
            if(err)
                console.log(err);
            else{
                if (rez.rowCount>0){
                    console.log("Șters cu succes");
                }
                else{
                    console.log("Ștergere eșuată!");
                }
            }
		});
	});
	}
	res.redirect("/useri");
	
});




///////////////////////////////////////////////////////////////////////////////////////////////
//////////////// Contact
caleXMLMesaje="resurse/xml/contact.xml";
headerXML=`<?xml version="1.0" encoding="utf-8"?>`;
function creeazaXMlContactDacaNuExista(){
    if (!fs.existsSync(caleXMLMesaje)){
        let initXML={
            "declaration":{
                "attributes":{
                    "version": "1.0",
                    "encoding": "utf-8"
                }
            },
            "elements": [
                {
                    "type": "element",
                    "name":"contact",
                    "elements": [
                        {
                            "type": "element",
                            "name":"mesaje",
                            "elements":[]                            
                        }
                    ]
                }
            ]
        }
        let sirXml=xmljs.js2xml(initXML,{compact:false, spaces:4});//obtin sirul xml (cu taguri)
        console.log(sirXml);
        fs.writeFileSync(caleXMLMesaje,sirXml);
        return false; //l-a creat
    }
    return true; //nu l-a creat acum
}


function parseazaMesaje(){
    let existaInainte=creeazaXMlContactDacaNuExista();
    let mesajeXml=[];
    let obJson;
    if (existaInainte){
        let sirXML=fs.readFileSync(caleXMLMesaje, 'utf8');
        obJson=xmljs.xml2js(sirXML,{compact:false, spaces:4});
        

        let elementMesaje=obJson.elements[0].elements.find(function(el){
                return el.name=="mesaje"
            });
        let vectElementeMesaj=elementMesaje.elements?elementMesaje.elements:[];// conditie ? val_true: val_false
        console.log("Mesaje: ",obJson.elements[0].elements.find(function(el){
            return el.name=="mesaje"
        }))
        let mesajeXml=vectElementeMesaj.filter(function(el){return el.name=="mesaj"});
        return [obJson, elementMesaje,mesajeXml];
    }
    return [obJson,[],[]];
}


app.get("/contact", function(req, res){
    let obJson, elementMesaje, mesajeXml;
    [obJson, elementMesaje, mesajeXml] =parseazaMesaje();

    res.render("pagini/contact",{ utilizator:req.session.utilizator, mesaje:mesajeXml})
});

app.post("/contact", function(req, res){
    let obJson, elementMesaje, mesajeXml;
    [obJson, elementMesaje, mesajeXml] =parseazaMesaje();
        
    let u= req.session.utilizator?req.session.utilizator.username:"anonim";
    let mesajNou={
        type:"element", 
        name:"mesaj", 
        attributes:{
            username:u, 
            data:new Date()
        },
        elements:[{type:"text", "text":req.body.mesaj}]
    };
    if(elementMesaje.elements)
        elementMesaje.elements.push(mesajNou);
    else 
        elementMesaje.elements=[mesajNou];
    console.log(elementMesaje.elements);
    let sirXml=xmljs.js2xml(obJson,{compact:false, spaces:4});
    console.log("XML: ",sirXml);
    fs.writeFileSync("resurse/xml/contact.xml",sirXml);
    
    res.render("pagini/contact",{ utilizator:req.session.utilizator, mesaje:elementMesaje.elements})
});







///////////////////////////////////////////////////////////////////////////////////////////////
////////////// Cereri generale

 app.get("/favicon.ico",function(req,res){//uneori browserul cere faviconul pentru a adauga paginain bookmarks sau in "pagini recente"
     res.sendFile("resurse/ico/sushi/favicon.ico");
});


//eroare 403 Forbidden
app.get("/*.ejs",function(req,res){
    //res.status(403).render("pagini/403");
    randeazaEroare(res,403);
});

//cererea generala. /* se potriveste cu orice. Ajunge aici doar daca nu a intrat pe un app.get(cale_specifica). Aici sunt tratate paginile nespeciale

app.get("/*", function(req,res){
    console.log(req.url);
    res.render("pagini"+req.url, function(err, rezRandare){
        if(err){
            console.log(err.message);
            if(err.message.includes("Failed to lookup")){
                //daca un view nu este gasit, trimitem eroarea 404
                //res.status(404).render("pagini/404");
                randeazaEroare(res,404);         // Ne trebuie un exit status ca sa stim ca am primit un alt status decat cel dorit
                return;
            }
            else{
                console.log(err);
                res.render("pagini/eroare");
            }
        }
        else
            res.send(rezRandare);
    });
});


function creeazaErori(){
    var continutFisier= fs.readFileSync(__dirname+"/resurse/json/erori.json", {}, function(err, data){ console.log(data);}).toString("utf8");
    
    obGlobal.obErori=JSON.parse(continutFisier);// atentie e global pentru ca nu e definit cu var sau let
    //console.log(obGlobal.obErori);
}
creeazaErori();

function randeazaEroare(res, identificator=-1, titlu, text, imagine){
    var eroare= obGlobal.obErori.erori.find(function(elem){ return elem.identificator == identificator })
    titlu= titlu || (eroare && eroare.titlu) || obGlobal.obErori.eroare_default.titlu;
    text= text || (eroare && eroare.text) || obGlobal.obErori.eroare_default.text;
    imagine= imagine || (eroare && path.join(obGlobal.obErori.cale_baza,eroare.imagine)) 
        || path.join(obGlobal.obErori.cale_baza, obGlobal.obErori.eroare_default.imagine);
    if(eroare && eroare.status)
        res.status(eroare.identificator)
    res.render("pagini/eroare_generala",{titlu:titlu, text:text, imagine:imagine });
}



var s_port= process.env.PORT || 8080;
app.listen(s_port);
console.log("-------  Server pornit  -------");
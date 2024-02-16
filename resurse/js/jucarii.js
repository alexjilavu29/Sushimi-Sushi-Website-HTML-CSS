window.addEventListener("DOMContentLoaded", function(){


    var btn=document.getElementById("filtrare");
    btn.onclick=function(){
        var articole=document.getElementsByClassName("jucarie");
        for(let art of articole){

            art.style.display="none";

            /*
            v=art.getElementsByClassName("nume")
            nume=v[0]*/
            var nume=art.getElementsByClassName("val-nume")[0];//<span class="val-nume">aa</span>
            console.log(nume.innerHTML)

            /* ---------------------------- Declarare variabila varsta_minima --------------------------*/    
            var varsta_minima=art.getElementsByClassName("val-varsta_minima")[0];
            console.log(varsta_minima.innerHTML)

            /*-------------------------------------------------------------------------------------------*/

            var conditie1=varsta_minima.innerHTML.startsWith(document.getElementById("inp-varsta_minima").value)

            var pret=art.getElementsByClassName("val-pret")[0]
            var conditie2=parseInt(pret.innerHTML) > parseInt(document.getElementById("inp-pret").value);

            if(conditie1 && conditie2)
                art.style.display="block";
            
        }
    }
    var rng=document.getElementById("inp-pret");
    rng.onchange=function(){
        var info = document.getElementById("infoRange");
        if(!info){
            info=document.createElement("span");
            info.id="infoRange"
            this.parentNode.appendChild(info);
        }
        
        info.innerHTML="("+this.value+")";
    }

/* ---------------------        Sortare dupa varsta si pret         -----------------------------*/ 

    function sorteaza(semn){
        var articole=document.getElementsByClassName("jucarie");
        var v_articole=Array.from(articole);
        v_articole.sort(function(a,b){
            var varsta_a=a.getElementsByClassName("val-varsta_minima")[0].innerHTML;
            var varsta_b=b.getElementsByClassName("val-varsta_minima")[0].innerHTML;
            if(varsta_a!=varsta_b){
                return semn*varsta_a.localeCompare(varsta_b);
            }
            else{
                
                var pret_a=parseInt(a.getElementsByClassName("val-pret")[0].innerHTML);
                var pret_b=parseInt(b.getElementsByClassName("val-pret")[0].innerHTML);
                return semn*(pret_a-pret_b);
            }
        });
        for(let art of v_articole){
            art.parentNode.appendChild(art);
        }
    }

    var btn2=document.getElementById("ascendent");
    btn2.onclick=function(){
        
        sorteaza(1)
    }

    var btn3=document.getElementById("descendent");
    btn3.onclick=function(){
        sorteaza(-1)
    }
 
    /*-------------------------------------------------------------------------------------------*/

    document.getElementById("resetare").onclick=function(){
        //resetare inputuri
        document.getElementById("i_rad4").checked=true;
        document.getElementById("inp-pret").value=document.getElementById("inp-pret").min;
        document.getElementById("infoRange").innerHTML="("+document.getElementById("inp-pret").min+")";

        var articole=document.getElementsByClassName("jucarie");
        for(let art of articole){

            art.style.display="block";
        }
    }
    ids_jucarii_init=localStorage.getItem("jucarii_selectate");
    if(ids_jucarii_init)
        ids_jucarii_init=ids_jucarii_init.split(",");
    else
        ids_jucarii_init=[]

    var checkboxuri_cos = document.getElementsByClassName("select-cos");
    for (let ch of checkboxuri_cos){
        if (ids_jucarii_init.indexOf(ch.value)!=-1)
            ch.checked=true;
        ch.onchange=function(){
            ids_jucarii=localStorage.getItem("jucarii_selectate")
            if(ids_jucarii)
                ids_jucarii=ids_jucarii.split(",");
            else
                ids_jucarii=[]
            console.log("Selectie veche:", ids_jucarii);
           
            if(ch.checked){
                ids_jucarii.push(ch.value);
            }
            else{
                ids_jucarii.splice(ids_jucarii.indexOf(ch.value), 1)
            }
            console.log("Selectie noua:",ids_jucarii);
            localStorage.setItem("jucarii_selectate",ids_jucarii.join(","))
        }
    }
 });


 window.onkeydown=function(e){
    console.log(e);
    if(e.key=="c" && e.altKey==true){
        var suma=0;
        var articole=document.getElementsByClassName("jucarie");
        for(let art of articole){
            if(art.style.display!="none")
                suma+=parseFloat(art.getElementsByClassName("val-pret")[0].innerHTML);
        }

        var spanSuma;
        spanSuma=document.getElementById("numar-suma");
        if(!spanSuma){
            spanSuma=document.createElement("span");
            spanSuma.innerHTML=" Suma:"+suma;//<span> Suma:...
            spanSuma.id="numar-suma";//<span id="..."
            document.getElementById("p-suma").appendChild(spanSuma);
            setTimeout(function(){document.getElementById("numar-suma").remove()}, 1500);
        }
    }


 }
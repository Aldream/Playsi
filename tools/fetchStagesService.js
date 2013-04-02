var jsdom = require("jsdom");
var http = require('http');

var username = "TON_IDENTIFIANT_INSA";
var password = "TON_MDP_INSA";

var urlCas = 'https://login.insa-lyon.fr/'
var urlStage = 'http://intranet-if.insa-lyon.fr/stages/Listestage.php'
var urlStageCas = 'https://login.insa-lyon.fr/cas/login?service=http%3A%2F%2Fintranet-if.insa-lyon.fr%2Fstages%2FListestage.php';

var serverPort = 6789;
	
http.createServer(function(request, response) {
    
	console.log('Got a request.');
	if(request.url == '/fetchStages') {
		RetrieveStages(function(jsonStages) {
			response.writeHead(200, {
				'Content-Type': 'application/json'
			});
			response.end(JSON.stringify(jsonStages));
		});
	}
}).listen(serverPort);
console.log('Server running at http://127.0.0.1:6789/');


/**
 * URI-encode un objet
 * Param :
 *	- obj : 	Objet à serialiser
 *	- prefix : 	Préfixe optionnel
 * Retour : String uri-encodée
 */
function EncodeURIObject(obj, prefix) {
    var str = [];
    for(var p in obj) {
        var k = prefix ? prefix + "[" + encodeURIComponent(p) + "]" : encodeURIComponent(p), v = obj[p];
        str.push(typeof v == "object" ? 
            UrlEncodeObject(v, k) :
            encodeURIComponent(k) + "=" + encodeURIComponent(v));
    }
    return str.join("&");
}

/**
 * Permet de s'authentifier avec le cas de l'insa de Lyon.
 * Param :
 *	- username : 	Username valide
 *	- password : 	MdP correspondant
 *	- url : 		URL du CAS à utiliser
 *	- callback : 	Callback une fois la procédure finie
 * Retour : /
 */
function CasAuthentification( username, password,  url, callback) {

	console.log('Start CAS Authentification.');
    	var formulaire = {	'username' : username, 
						'password' : password, 
						'_eventId' : 'submit',
						'lt' : '' 
	};
	
	jsdom.env(
		url,
		function (errors, window) {
			console.log('Retrieved CAS page:');
			
			console.log(window.document.body.innerHTML);
    	
			// On recupère les valeurs manquantes pour notre formulaire : 
			formulaire['lt'] = window.document.querySelector('input[name="lt"]').value;
			url = urlStageCas;
			console.log('CAS Form URL: '+url);
			if (url.indexOf("?") != -1) { url += "&"; }
			else { url += "?"; }
			console.log('CAS Form URL: '+url);
			url += EncodeURIObject(formulaire);
			console.log('CAS Form URL: '+url);
    	
			// On  peut maintenant effectuer la connexion :
			jsdom.env(
				url,
				callback
			);
		}
	);
}

/**
 * Parse la page des stages pour stocker les informations dans un JSON.
 * Param :
 *	- dom : DOM de la page à parser
 *	- url : URL de la page, pour traiter les chemins relatifs
 * Retour : JSON contenant les données des stages
 */
function ParseStage( dom, url ) {
	var arrayLien = url.split('/');
	arrayLien.pop();
	var lienDossier = arrayLien.join("/")+"/";
	
	var jsonStages = {
		dossierDescriptions : lienDossier, 	// Partie absolue du chemin vers les documents des champs "description"
		stages : []				// Liste des stages extraits
	};

/* 	// La structure HTML est tellement immonde que les scrappers testés n'arrivent pas à récupérer correctement le DOM. Après avoir quand même tenté d'utiliser le pseudo-arbre généré, j'ai fini par laisser tomber pour passer à la méthode bourrine des regex ...
	// Si un jour ils retouchent leur template, peut-être que le code ci-dessous pourra servir ...
	
	var titres = dom.getElementsByTagName('h4');
	for (var i = titres.length; i--;) {
		// Le DOM est immonde, donc la recuperation aussi:
		var titre = titres[i];
		var contactNode = titre.nextSibling.nextSibling.nextSibling;
		var sujetNode = contactNode.nextSibling.nextSibling;
		var descriptionNode = sujetNode.nextSibling.nextSibling;
		if (sujetNode.nodeName == '#text') { descriptionNode = descriptionNode.nextSibling; } // S'il y a un sujet, ca fait un noeud de plus.
		var noteNode = null;
		if (descriptionNode.nextElementSibling && descriptionNode.nextElementSibling.nodeName == 'I') {
			noteNode = descriptionNode.nextElementSibling.nextSibling;
		}
		console.log(titre.children);
		console.log(( noteNode && noteNode.nodeValue.length > 3)? noteNode.nodeValue.split(/^\s?\:\s?/)[1].trim() : null);
		console.log(descriptionNode.innerText);
		console.log((sujetNode.nodeName == '#text' && sujetNode.nodeValue.length > 3)? sujetNode.nodeValue.split(/^\s?\:\s?/)[1].trim() : null);
		console.log(contactNode.nodeValue.length > 3? contactNode.nodeValue.split(/^\s?\:\s?/)[1].trim() : null);
		var entrEtLieu = titre.firstElementChild.nextSibling.nodeValue.split(/[^\w]{3}/);
		jsonStages.stages.push({
			annee: titres[i].innerText.split('IF')[0],
			entreprise: entrEtLieu[0],
			lieu: entrEtLieu[1],
			contact: contactNode.nodeValue.length > 3? contactNode.nodeValue.split(/^\s?\:\s?/)[1].trim() : null,
			sujet: (sujetNode.nodeName == '#text' && sujetNode.nodeValue.length > 3)? sujetNode.nodeValue.split(/^\s?\:\s?/)[1].trim() : null,
			description: descriptionNode.innerText,
			notes: ( noteNode && noteNode.nodeValue.length > 3)? noteNode.nodeValue.split(/^\s?\:\s?/)[1].trim() : null
		});
		console.log(jsonStages.stages[jsonStages.stages.length-1]);
	}
*/
	// La liste est affichee 4 fois dans un ordre different ... On recup donc que la 1ere version:
	var body = dom.innerHTML;
	var htmlStages = body.split('<font color="Red"><h2>Liste par ordre d\'arrivée de la proposition de stage</h2></font>')[1].split('<a href="#Menu">Retour au début</a>')[0];
	
	var re = new RegExp('<h4>([345-]+)IF ' 												// Annee
			+ 'n° ([0-9]+)' 						// Numero
			+ '[^:]+:[\s]*([^&]+)' 						// Entreprise
                        // + (&nbsp;){3}
			+ '([^(</)]+)</h4>'						// Lieu
                        + '[^<]*<i>[A-z]+</i>[^:]+:(.*)' 				// Contact (peut etre vide mais champ quand meme present)
                        + '[^<]*<i>[A-z]+</i>[^:]+:(.*)' 				// Sujet (peut etre vide mais champ quand meme present)
                        + '(?:[^<]*<i>[A-z]+</i>[^:]+:[^(href=")]+href="([^"]*)[^\n]*)?'// Description (peut etre absent)
                        + '[^<]*(?:<br>|<i>Notes</i>[^:]+:)((?:(?!<h4>)(?:.|\n))*)', 	// Notes (peut etre absent)
                        'gm');
						
	var match;
	while ((match = re.exec(htmlStages)) !== null) {
		// Nettoyage des chaines obtenues :
		var contact = match[5]? match[5].replace(/<br>/g,'\n').trim() : null;
		var sujet = match[6]? match[6].replace(/<br>/g,'\n').trim() : null;
		var notes = match[8]? match[8].replace(/<br>/g,'\n').trim() : null;
		var description = match[7]? match[7] : null;
		
		// Construction du JSON :
		jsonStages.stages.push({
			annee: match[1],
			num: match[2],
			entreprise: match[3].trim(),
			lieu: match[4].replace(/&nbsp;/g,'').trim(),
			contact: contact? contact : null, // "string? string : null" permet de remplacer par null les chaines vides apres trimage.
			sujet: sujet? sujet : null,
			description: description,
			notes: notes? notes : null
		});
		//console.log(jsonStages.stages[jsonStages.stages.length-1]);
	}
	console.log('Extraction finie. ' + jsonStages.stages.length + ' stages parsés.');
	return jsonStages;
}

/**
 * Service asynchrone récupérant les données de stages sur l'intranet IF au format JSON. 
 * Param :
 *	- callback : Callback recevant en paramètre le JSON des stages.
 * Retour : /
 */
function RetrieveStages(callback) {
	CasAuthentification(username, password,  urlCas, function(errors, window) {
			console.log('Retrieved Stages page:');
			
			console.log(window.document.body.innerHTML);
		// Une fois connecté, on recupere la page des stages :
		jsdom.env(
			urlStage,
			function (errors, window) {
			console.log('Retrieved Stages page:');
			
			console.log(window.document.body.innerHTML);
				if (errors) {
					callback(errors);
				}
				else {
					// Et on la parse avant de retourner le tout :
					callback(ParseStage( window.document.getElementsByTagName('body')[0], urlStage )); 
				}
			}
		);
	})
}

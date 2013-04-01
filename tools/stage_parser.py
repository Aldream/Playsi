#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import urllib.parse, urllib.request
import http.cookiejar
from bs4 import BeautifulSoup
import re


def casAuthentification( username, password,  url ):
    """ Permet de s'authentifier avec le cas de l'insa de Lyon        """
    """ username --> login utilisateur                                """
    """ password --> mot de passe utilisateur                         """
    """ Retourne un objet pouvant récupérer des pages derrière le CAS """

    formulaire = {  'username' : username, 
                    'password' : password, 
                    '_eventId' : 'submit',
                    'lt' : '' 
                 }

    cookieJar = http.cookiejar.CookieJar();
    opener = urllib.request.build_opener( urllib.request.HTTPCookieProcessor( cookieJar ) )
    page = BeautifulSoup( opener.open( url ) )

    formulaire['lt'] = page.find( 'input', { 'name' : 'lt'} )['value'] 
    url = url + page.find( 'form', { 'id' : 'login_form' } )['action']
    data = urllib.parse.urlencode( formulaire )

    page = BeautifulSoup( opener.open( url, data.encode('ASCII') ) )

    return opener


def parseStage( page ):
    """ Parse la page des stages pour stocker les informations de stage """
    """ dans un dictionnaire. La fonction est un générateur             """
    """ Retourne un dictionnaire.                                       """ 

    # BeautifulSoup ne peut pas récupérer le texte car il n'est dans aucune balise valide
    # Pardonnez nous pour nos péchés...
    pattern = re.compile( '<h3>([345-]+)IF([^\s]*\s){2}([0-9]+)[^:]+:[\s]*([^&]+)' # Titre
                          '([^<]+)</h3>'                                           # Region
                          '.*?<i>.*?</i>[^:]+:[\s]*(.*?)'                          # Contact
                          '<i>.*?</i>[^:]+:[\s]*(.*?)'                             # Sujet
                          '<i>.*?<a.*?href="([^"]+)"(.*?</br>){1,4}'               # Description
                        )

    cleanerPattern = re.compile( '(<[^>]+>)|(&nbsp;)|(\\\\(r|n))' )

    for matchs in pattern.finditer( str(page.read()) ):

        yield { 'promotion' : matchs.group(1).split('-'), 
                'numero' : matchs.group(3), 
                'entreprise' : cleanerPattern.sub( ' ', matchs.group(4) ).strip( ' ' ), 
                'region' :  cleanerPattern.sub( ' ', matchs.group(5) ).strip( ' ' ), 
                'contact' : cleanerPattern.sub( ' ', matchs.group(6) ).strip( ' ' ) ,
                'sujet' : cleanerPattern.sub( ' ', matchs.group(7) ).strip( ' ' )
              }




if __name__ == '__main__':

    urlCas = 'https://login.insa-lyon.fr/'
    urlStage = 'http://intranet-if.insa-lyon.fr/stages/Listestage.php'


    pageOpener = casAuthentification( 'rgerard',  'XXXXXXXXXXXXXXX', urlCas ) 
    page = pageOpener.open( urlStage ) 
    stages = parseStage( page ) 


    for stage in stages:
        print( "Entreprise : {}".format( stage['entreprise'] ) )
        print( "Region : {}".format( stage['region'] ) )
        print( "Sujet : {}".format( stage['sujet'] ) )
        print( "\n" )




# iPhone Web Blocklist Profilgenerator

Statische WebApp zum lokalen Erzeugen eines Apple-Konfigurationsprofils (`.mobileconfig`) mit `com.apple.webcontent-filter`-Payload.

## Struktur

- `index.html`: Markup und zugängliche UI-Struktur
- `styles.css`: responsives Material-inspiriertes Light-/Dark-Theme
- `app.js`: Parsing, Validierung, XML-Generierung, Vorschau, Kopieren und Download

## Lokal starten

Die App benötigt keinen Build-Schritt und kein Backend.

1. Projekt entpacken oder Dateien in einen Ordner legen.
2. `index.html` per Doppelklick im Browser öffnen.
3. Alternativ über beliebiges statisches Hosting bereitstellen.

## Hosting

Geeignet sind einfache statische Hosts, zum Beispiel GitHub Pages, Netlify oder ein beliebiger Webserver, der nur die drei Dateien ausliefert.

## Fachliche Hinweise

- Alle Daten bleiben lokal im Browser des Besuchers.
- Es findet keine Server-Kommunikation und kein externer API-Aufruf statt.
- Die App erzeugt einen standardnahen Generator für ein Apple-Konfigurationsprofil mit Web-Content-Filter-Payload.
- Ob die Sperren auf einem iPhone tatsächlich greifen, hängt vom Apple-Verwaltungs-, Enrollment- und Installationskontext des Zielgeräts ab. Die referenzierte Payload-Dokumentation beschreibt den Built-In-Filter insbesondere für überwachte Geräte.
- Eine manuelle Profilinstallation auf dem iPhone kann möglich sein, aber nicht jeder Payload ist in jedem privaten oder unverwalteten Szenario garantiert wirksam.
- Nach Entfernung des Profils sollen die Einschränkungen wieder entfallen; auch das ist als vorsichtiger Hinweis zu verstehen, nicht als universelle Garantie.

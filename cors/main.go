package main

import (
	"flag"
	"io"
	"io/ioutil"
	"log"
	"net/http"
	"net/url"
)

func OutError(w http.ResponseWriter, code int, msg string) {
	log.Println(msg)
	w.WriteHeader(code)
	w.Write([]byte(msg))

}

func proxyHandler(w http.ResponseWriter, r *http.Request) {

	u, ok := r.URL.Query()["u"]

	if !ok || len(u[0]) < 1 {
		OutError(w, http.StatusBadRequest, "400 - URL is missing")
		return
	}

	// validate URL
	_, err := url.ParseRequestURI(u[0])
	if err != nil {
		OutError(w, http.StatusBadRequest, "400 - bad URL")
		return
	}

	// do request
	userAgent := r.Header.Get("user-agent")
	if userAgent == "" {
		userAgent = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.98 Safari/537.36"
	}
	client := http.Client{}
	request, err := http.NewRequest("GET", u[0], nil)
	if err != nil {
		OutError(w, http.StatusInternalServerError, err.Error())
		return
	}
	request.Header.Set("referer", "referer: https://www.ovh.com/manager/dedicated/index.html")
	request.Header.Set("user-agent", userAgent)

	response, err := client.Do(request)
	if err != nil {
		OutError(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer response.Body.Close()

	// reply
	w.Header().Add("Access-Control-Allow-Origin", "*")
	for k, v := range response.Header {
		for _, s := range v {
			w.Header().Add(k, s)
		}
	}

	body, err := ioutil.ReadAll(response.Body)
	if err != nil {
		OutError(w, http.StatusInternalServerError, err.Error())
		return
	}

	w.WriteHeader(response.StatusCode)

	if _, err := w.Write(body); err != nil {
		log.Printf("write body failed: %v", err)
		return
	}
}

func main() {
	addr := flag.String("addr", ":8080", "Address to listen on")
	verbose := flag.Bool("v", false, "Verbose output")
	flag.Parse()
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		u := r.URL.Query().Get("u")
		if *verbose {
			log.Println(u)
		}
		if u == "" {
			http.Error(w, "url is missing", http.StatusBadRequest)
			return
		}
		if _, err := url.ParseRequestURI(u); err != nil {
			http.Error(w, "bad url", http.StatusBadRequest)
			return
		}
		ua := r.Header.Get("User-Agent")
		if ua == "" {
			ua = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.98 Safari/537.36"
		}
		c := http.Client{}
		req, err := http.NewRequest("GET", u, nil)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		req = req.WithContext(r.Context())
		req.Header.Set("User-Agent", ua)
		res, err := c.Do(req)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		defer res.Body.Close()

		w.Header().Add("Access-Control-Allow-Origin", "*")
		for k, v := range res.Header {
			for _, s := range v {
				w.Header().Add(k, s)
			}
		}

		w.WriteHeader(res.StatusCode)
		io.Copy(w, res.Body)
	})
	log.Fatal(http.ListenAndServe(*addr, nil))
}

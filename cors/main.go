package main

import (
	"flag"
	"io"
	"log"
	"net/http"
	"net/url"
)

func main() {
	addr := flag.String("addr", ":8080", "Address to listen on")
	flag.Parse()
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Add("Access-Control-Allow-Origin", "*")
		w.Header().Add("Access-Control-Allow-Methods", "GET, PUT, PATCH, POST, DELETE")
		w.Header().Add("Access-Control-Allow-Headers", r.Header.Get("Access-Control-Request-Headers"))
		u := r.URL.Query().Get("u")
		if _, err := url.ParseRequestURI(u); err != nil {
			http.Error(w, "bad URL", http.StatusBadRequest)
			return
		}
		req, err := http.NewRequest("GET", u, nil)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		req = req.WithContext(r.Context())
		req.Header.Set("User-Agent", r.Header.Get("User-Agent"))
		res, err := http.DefaultClient.Do(req)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		defer res.Body.Close()
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

# Programming catalog

Reviewed November 4, 2026. The catalog contains **200 distinct programming titles**,
including **60 Rust books**, **34 free online editions**, and **166 paid publisher listings**.
Rust is listed first throughout the shared web/Android catalog.

Free means a complete online edition is available from its author, project, or authorized publisher.
Paid listings link to the publisher or author; purchasing and subscription access are handled there.
Descriptions are original catalog summaries. Book files and publisher cover artwork are not redistributed.

The versioned source manifest is `backend/app/data/programming_books.json`.
Every record includes title, author, category, description, source/access terms, verification URL,
and review date. A book is counted once; chapters, translations, and duplicate editions are excluded.

## Distribution

| Category | Books |
| --- | ---: |
| Rust | 60 |
| C / C++ | 20 |
| C# | 10 |
| Go | 15 |
| Java | 15 |
| JavaScript / TypeScript | 25 |
| Kotlin | 5 |
| Python | 25 |
| Ruby | 5 |
| Software Engineering | 15 |
| Swift | 5 |

## Verification and import

Primary author, project, and publisher pages supplied title/author/access metadata.
The audit obtained 165 direct HTTP 200 responses. Thirty-four genuine publisher pages blocked
automated requests; one author page had a client certificate-chain failure. Their metadata was
checked separately through primary web sources. These restricted fetches are not recorded as
successful HTTP checks. Availability and publisher terms can change after the review date.

Run `python -m alembic upgrade head`, then `python -m app.services.seed` from `backend`.
Migration `0002` adds `access_type` and `is_active` with compatible defaults. The seed validates
the complete manifest before writing, upserts by source URL, keeps existing book IDs, and archives
only the original eight known Gutenberg samples. Other maintained entries are left alone.
Favorites, download rows, accounts, and existing allowance usage are retained. Public catalog routes
show active books; private history can still include archived books. Paid listings cannot consume
a new in-app download allowance. This request-tracking API does not deliver book files.

Migration downgrade to `0001` preserves all book and history rows but removes the access/visibility
columns; it does not restore the old eight-title catalog. The current API requires those columns.
Do not downgrade production underneath the current application. Preservation and re-upgrade
are tested on the isolated test database, followed by reapplying the manifest classifications.

## Deployed verification — November 4, 2026

The existing Wasmer website and shared backend now serve this catalog. The production
import left 200 active programming titles and eight archived samples, with existing
account, favorite, and download counts preserved. The updated debug APK uses the same API.

Verification passed: 46 backend tests, nine frontend unit tests, six local browser
tests, 12 live website catalog checks, and 15 installed Android emulator checks.
Live checks confirmed pagination, Rust/Python filters, honest free/paid source links,
and paid download rejection without consuming allowance. See [test evidence](testing.md)
and [current APK metadata and installation](android.md).

## Titles

### Rust

| Title | Author | Access |
| --- | --- | --- |
| [Advanced Hands-on Rust](https://pragprog.com/titles/hwmrust/advanced-hands-on-rust/) | Herbert Wolverson | Paid publisher listing |
| [Advanced Rust](https://link.springer.com/book/10.1007/979-8-8688-2992-5) | Nouman Azam | Paid publisher listing |
| [Async Rust](https://www.oreilly.com/library/view/async-rust/9781098149086/) | Maxwell Flitton; Caroline Morton | Paid publisher listing |
| [Asynchronous Programming in Rust](https://rust-lang.github.io/async-book/) | Rust Project Developers | Free online edition |
| [Beginning Axum](https://link.springer.com/book/10.1007/979-8-8688-2631-3) | Indo Yoon | Paid publisher listing |
| [Beginning Rust](https://link.springer.com/book/10.1007/978-1-4842-7208-4) | Carlo Milanesi | Paid publisher listing |
| [Code Like a Pro in Rust](https://www.manning.com/books/code-like-a-pro-in-rust) | Brenden Matthews | Paid publisher listing |
| [Command-Line Rust](https://www.oreilly.com/library/view/command-line-rust/9781098109424/) | Ken Youens-Clark | Paid publisher listing |
| [Creative Projects for Rust Programmers](https://www.packtpub.com/en-us/product/creative-projects-for-rust-programmers-9781789346220) | Carlo Milanesi | Paid publisher listing |
| [Deep Learning with Rust](https://link.springer.com/book/10.1007/979-8-8688-2208-7) | Mehrdad Maleki | Paid publisher listing |
| [Design Patterns and Best Practices in Rust](https://www.packtpub.com/en-us/product/design-patterns-and-best-practices-in-rust-9781836209478) | Evan Williams | Paid publisher listing |
| [Discovery](https://docs.rust-embedded.org/discovery/microbit/) | Jorge Aparicio; Rust Embedded Devices Working Group | Free online edition |
| [Effective Rust](https://www.oreilly.com/library/view/effective-rust/9781098151393/) | David Drysdale | Paid publisher listing |
| [Hands-On Concurrency with Rust](https://www.packtpub.com/en-us/product/hands-on-concurrency-with-rust-9781788399975) | Brian L. Troutwine | Paid publisher listing |
| [Hands-On Data Structures and Algorithms with Rust](https://www.packtpub.com/en-us/product/hands-on-data-structures-and-algorithms-with-rust-9781788995528) | Claus Matzinger | Paid publisher listing |
| [Hands-On Functional Programming in Rust](https://www.packtpub.com/en-us/product/hands-on-functional-programming-in-rust-9781788831581) | Andrew Johnson | Paid publisher listing |
| [Hands-On Microservices with Rust](https://www.packtpub.com/en-us/product/hands-on-microservices-with-rust-9781789342758) | Denis Kolodin | Paid publisher listing |
| [Hands-on Rust](https://pragprog.com/titles/hwrust/hands-on-rust/) | Herbert Wolverson | Paid publisher listing |
| [Idiomatic Rust](https://www.manning.com/books/idiomatic-rust) | Brenden Matthews | Paid publisher listing |
| [Learn Rust in a Month of Lunches](https://www.manning.com/books/learn-rust-in-a-month-of-lunches) | David MacLeod | Paid publisher listing |
| [Learn Rust Programming](https://bpbonline.com/products/learn-rust-programming) | Claus Matzinger | Paid publisher listing |
| [Learning Rust](https://www.packtpub.com/en-us/product/learning-rust-9781785884306) | Paul Johnson; Vesa Kaihlavirta | Paid publisher listing |
| [Learning Rust With Entirely Too Many Linked Lists](https://rust-unofficial.github.io/too-many-lists/) | Alexis Beingessner; contributors | Free online edition |
| [Mastering Rust](https://www.packtpub.com/en-us/product/mastering-rust-9781789346572) | Rahul Sharma; Vesa Kaihlavirta | Paid publisher listing |
| [Network Programming with Rust](https://www.packtpub.com/en-us/product/network-programming-with-rust-9781788624893) | Abhishek Chanda | Paid publisher listing |
| [Practical Rust Projects](https://link.springer.com/book/10.1007/978-1-4842-9331-7) | Shing Lyu; Andrew Rzeznik | Paid publisher listing |
| [Practical Rust Web Projects](https://link.springer.com/book/10.1007/978-1-4842-6589-5) | Shing Lyu | Paid publisher listing |
| [Practical System Programming for Rust Developers](https://www.packtpub.com/en-us/product/practical-system-programming-for-rust-developers-9781800560963) | Prabhu Eshwarla | Paid publisher listing |
| [Programming Rust](https://www.oreilly.com/library/view/programming-rust-3rd/9781098176228/) | Jim Blandy; Jason Orendorff; Leonora F. S. Tindall | Paid publisher listing |
| [Programming WebAssembly with Rust](https://pragprog.com/titles/khrust/programming-webassembly-with-rust/) | Kevin Hoffman | Paid publisher listing |
| [Refactoring to Rust](https://www.manning.com/books/refactoring-to-rust) | Lily Mara; Joel Holmes | Paid publisher listing |
| [Rust Atomics and Locks](https://mara.nl/atomics/) | Mara Bos | Free online edition |
| [Rust Brain Teasers](https://pragprog.com/titles/hwrustbrain/rust-brain-teasers/) | Herbert Wolverson | Paid publisher listing |
| [Rust By Example](https://doc.rust-lang.org/rust-by-example/) | Rust Project Developers | Free online edition |
| [Rust Crash Course](https://bpbonline.com/products/rust-crash-course) | Abhishek Kumar | Paid publisher listing |
| [Rust Essentials](https://www.packtpub.com/en-us/product/rust-essentials-9781788390019) | Ivo Balbaert | Paid publisher listing |
| [Rust for C++ Developers](https://www.packtpub.com/en-us/product/rust-for-c-developers-9781836206514) | Dan Olson | Paid publisher listing |
| [Rust for C++ Programmers](https://bpbonline.com/products/rust-for-c-programmers) | Mustafif Khan | Paid publisher listing |
| [Rust for Rustaceans](https://nostarch.com/rust-rustaceans) | Jon Gjengset | Paid publisher listing |
| [Rust High Performance](https://www.packtpub.com/en-us/product/rust-high-performance-9781788399487) | Iban Eguia Moraza | Paid publisher listing |
| [Rust in Action](https://www.manning.com/books/rust-in-action) | Tim McNamara | Paid publisher listing |
| [Rust Programming By Example](https://www.packtpub.com/en-us/product/rust-programming-by-example-9781788390637) | Guillaume Gomez; Antoni Boucher | Paid publisher listing |
| [Rust Programming Cookbook](https://www.packtpub.com/en-us/product/rust-programming-cookbook-9781789530667) | Claus Matzinger | Paid publisher listing |
| [Rust Quick Start Guide](https://www.packtpub.com/en-us/product/rust-quick-start-guide-9781789616705) | Daniel Arbuckle | Paid publisher listing |
| [Rust Servers, Services, and Apps](https://www.manning.com/books/rust-servers-services-and-apps) | Prabhu Eshwarla | Paid publisher listing |
| [Rust Standard Library Cookbook](https://www.packtpub.com/en-us/product/rust-standard-library-cookbook-9781788623926) | Jan Hohenheim; Daniel Durante | Paid publisher listing |
| [Rust Web Development](https://www.manning.com/books/rust-web-development) | Bastian Gruber | Paid publisher listing |
| [Rust Web Programming](https://www.packtpub.com/en-us/product/rust-web-programming-third-edition-9781835887769) | Maxwell Flitton | Paid publisher listing |
| [Rust: The Practical Guide](https://www.rheinwerk-verlag.de/rust-the-practical-guide/) | Nouman Azam | Paid publisher listing |
| [The Cargo Book](https://doc.rust-lang.org/cargo/) | Rust Project Developers | Free online edition |
| [The Embedded Rust Book](https://docs.rust-embedded.org/book/) | Rust Embedded Devices Working Group | Free online edition |
| [The Little Book of Rust Macros](https://lukaswirth.dev/tlborm/) | Daniel Keep; Lukas Wirth; contributors | Free online edition |
| [The Rust Performance Book](https://nnethercote.github.io/perf-book/) | Nicholas Nethercote | Free online edition |
| [The Rust Programming Handbook](https://www.packtpub.com/en-us/product/the-rust-programming-handbook-9781836208877) | Francesco Ciulla | Paid publisher listing |
| [The Rust Programming Language](https://doc.rust-lang.org/book/) | Steve Klabnik; Carol Nichols; Chris Krycho; Rust Community contributors | Free online edition |
| [The Rust Reference](https://doc.rust-lang.org/reference/) | Rust Project Developers | Free online edition |
| [The rustc Book](https://doc.rust-lang.org/rustc/) | Rust Project Developers | Free online edition |
| [The Rustonomicon](https://doc.rust-lang.org/nomicon/) | Rust Project Developers | Free online edition |
| [Write Powerful Rust Macros](https://www.manning.com/books/write-powerful-rust-macros) | Sam Van Overmeire | Paid publisher listing |
| [Zero To Production In Rust](https://www.zero2prod.com/) | Luca Palmieri | Paid publisher listing |

### C / C++

| Title | Author | Access |
| --- | --- | --- |
| [100 C++ Mistakes and How to Avoid Them](https://www.manning.com/books/100-c-plus-plus-mistakes-and-how-to-avoid-them) | Rich Yonts | Paid publisher listing |
| [A Tour of C++, Third Edition](https://www.stroustrup.com/tour3.html) | Bjarne Stroustrup | Paid publisher listing |
| [C Interfaces and Implementations](https://drh.github.io/cii/) | David Hanson | Paid publisher listing |
| [C Programming: A Modern Approach, Second Edition](https://wwnorton.com/books/9780393979503) | K. N. King | Paid publisher listing |
| [C++ Concurrency in Action, Second Edition](https://www.manning.com/books/c-plus-plus-concurrency-in-action-second-edition) | Anthony Williams | Paid publisher listing |
| [C++ Crash Course](https://nostarch.com/node/455) | Josh Lospinoso | Paid publisher listing |
| [C++/CLI in Action](https://www.manning.com/books/c-plus-plus-cli-in-action) | Nishant Sivakumar | Paid publisher listing |
| [Effective C++, Third Edition](https://www.informit.com/store/effective-c-plus-plus-55-specific-ways-to-improve-your-9780321334879) | Scott Meyers | Paid publisher listing |
| [Effective C, Second Edition](https://nostarch.com/node/790) | Robert C. Seacord | Paid publisher listing |
| [Effective Modern C++](https://www.aristeia.com/books.html) | Scott Meyers | Paid publisher listing |
| [Effective STL](https://www.informit.com/store/effective-stl-50-specific-ways-to-improve-your-use-9780132800143) | Scott Meyers | Paid publisher listing |
| [Functional Programming in C++](https://www.manning.com/books/functional-programming-in-c-plus-plus) | Ivan Čukić | Paid publisher listing |
| [Learn C++ by Example](https://www.manning.com/books/learn-c-plus-plus-by-example) | Frances Buontempo | Paid publisher listing |
| [Modern C, Third Edition](https://www.manning.com/books/modern-c-third-edition) | Jens Gustedt | Paid publisher listing |
| [More Effective C++](https://www.informit.com/store/more-effective-c-plus-plus-35-new-ways-to-improve-your-9780132800136) | Scott Meyers | Paid publisher listing |
| [Object-Oriented Software Design in C++](https://www.manning.com/books/object-oriented-software-design-in-c-plus-plus) | Ronald Mak | Paid publisher listing |
| [Programming: Principles and Practice Using C++, Third Edition](https://www.stroustrup.com/programming.html) | Bjarne Stroustrup | Paid publisher listing |
| [The C Programming Language, Second Edition](https://www.cs.princeton.edu/~bwk/cbook.html) | Brian W. Kernighan, Dennis M. Ritchie | Paid publisher listing |
| [The C++ Programming Language, Fourth Edition](https://www.stroustrup.com/4th.html) | Bjarne Stroustrup | Paid publisher listing |
| [The C++ Standard Library, Second Edition](https://www.cppstdlib.com/) | Nicolai M. Josuttis | Paid publisher listing |

### C#

| Title | Author | Access |
| --- | --- | --- |
| [ASP.NET Core in Action, Third Edition](https://www.manning.com/books/asp-net-core-in-action-third-edition) | Andrew Lock | Paid publisher listing |
| [ASP.NET Core Security](https://www.manning.com/books/asp-net-core-security) | Christian Wenz | Paid publisher listing |
| [Blazor in Action](https://www.manning.com/books/blazor-in-action) | Chris Sainty | Paid publisher listing |
| [C# Concurrency](https://www.manning.com/books/csharp-concurrency) | Nir Dobovizki | Paid publisher listing |
| [C# in Depth, Fourth Edition](https://www.manning.com/books/c-sharp-in-depth-fourth-edition) | Jon Skeet | Paid publisher listing |
| [Code like a Pro in C#](https://www.manning.com/books/code-like-a-pro-in-c-sharp) | Jort Rodenburg | Paid publisher listing |
| [Dependency Injection Principles, Practices, and Patterns](https://www.manning.com/books/dependency-injection-principles-practices-patterns) | Steven van Deursen, Mark Seemann | Paid publisher listing |
| [Entity Framework Core in Action, Second Edition](https://www.manning.com/books/entity-framework-core-in-action-second-edition) | Jon P Smith | Paid publisher listing |
| [Functional Programming in C#, Second Edition](https://www.manning.com/books/functional-programming-in-c-sharp-second-edition) | Enrico Buonanno | Paid publisher listing |
| [Rx.NET in Action](https://www.manning.com/books/rx-dot-net-in-action) | Tamir Dresher | Paid publisher listing |

### Go

| Title | Author | Access |
| --- | --- | --- |
| [100 Go Mistakes and How to Avoid Them](https://www.manning.com/books/100-go-mistakes-and-how-to-avoid-them) | Teiva Harsanyi | Paid publisher listing |
| [Cloud Native Go](https://www.oreilly.com/library/view/cloud-native-go/9781492076322/) | Matthew A. Titmus | Paid publisher listing |
| [Concurrency in Go](https://www.oreilly.com/library/view/concurrency-in-go/9781491941294/) | Katherine Cox-Buday | Paid publisher listing |
| [Distributed Services with Go](https://pragprog.com/titles/tjgo/distributed-services-with-go/) | Travis Jeffery | Paid publisher listing |
| [Get Programming with Go](https://www.manning.com/books/get-programming-with-go) | Nathan Youngman and Roger Peppé | Paid publisher listing |
| [Go Brain Teasers](https://pragprog.com/titles/d-gobrain/go-brain-teasers/) | Miki Tebeka | Paid publisher listing |
| [Go in Action](https://www.manning.com/books/go-in-action-second-edition) | Joel Holmes, Andrew Walker, and William Kennedy | Paid publisher listing |
| [Go in Practice](https://www.manning.com/books/go-in-practice-second-edition) | Nathan Kozyra, Matt Butcher, and Matt Farina | Paid publisher listing |
| [Go Web Programming](https://www.manning.com/books/go-web-programming) | Sau Sheong Chang | Paid publisher listing |
| [Learn Go with Pocket-Sized Projects](https://www.manning.com/books/learn-go-with-pocket-sized-projects) | Aliénor Latour, Donia Chaiehloudj, and Pascal Bertrand | Paid publisher listing |
| [Learning Go](https://www.oreilly.com/library/view/learning-go-2nd/9781098139285/) | Jon Bodner | Paid publisher listing |
| [Let's Go](https://lets-go.alexedwards.net/) | Alex Edwards | Paid publisher listing |
| [Let's Go Further](https://lets-go-further.alexedwards.net/) | Alex Edwards | Paid publisher listing |
| [Powerful Command-Line Applications in Go](https://pragprog.com/titles/rggo/powerful-command-line-applications-in-go/) | Ricardo Gerardi | Paid publisher listing |
| [The Go Programming Language](https://www.gopl.io/) | Alan A. A. Donovan and Brian W. Kernighan | Paid publisher listing |

### Java

| Title | Author | Access |
| --- | --- | --- |
| [100 Java Mistakes and How to Avoid Them](https://www.manning.com/books/100-java-mistakes-and-how-to-avoid-them) | Tagir Valeev | Paid publisher listing |
| [Functional Programming in Java](https://www.manning.com/books/functional-programming-in-java) | Pierre-Yves Saumont | Paid publisher listing |
| [Java Concurrency in Practice](https://jcip.net/) | Brian Goetz, Tim Peierls, Joshua Bloch, Joseph Bowbeer, David Holmes, Doug Lea | Paid publisher listing |
| [Java Persistence with Spring Data and Hibernate](https://www.manning.com/books/java-persistence-with-spring-data-and-hibernate) | Cătălin Tudose | Paid publisher listing |
| [Java Testing with Spock](https://www.manning.com/books/java-testing-with-spock) | Konstantinos Kapelonis | Paid publisher listing |
| [JUnit in Action, Third Edition](https://www.manning.com/books/junit-in-action-third-edition) | Cătălin Tudose | Paid publisher listing |
| [Modern Java in Action](https://www.manning.com/books/modern-java-in-action) | Raoul-Gabriel Urma, Mario Fusco, Alan Mycroft | Paid publisher listing |
| [Spring Boot in Practice](https://www.manning.com/books/spring-boot-in-practice) | Somnath Musib | Paid publisher listing |
| [Spring in Action, Sixth Edition](https://www.manning.com/books/spring-in-action-sixth-edition) | Craig Walls | Paid publisher listing |
| [Spring Security in Action, Second Edition](https://www.manning.com/books/spring-security-in-action-second-edition) | Laurentiu Spilca | Paid publisher listing |
| [Spring Start Here](https://www.manning.com/books/spring-start-here) | Laurentiu Spilca | Paid publisher listing |
| [The Java Module System](https://www.manning.com/books/the-java-module-system) | Nicolai Parlog | Paid publisher listing |
| [The Well-Grounded Java Developer, Second Edition](https://www.manning.com/books/the-well-grounded-java-developer-second-edition) | Benjamin Evans, Jason Clark, Martijn Verburg | Paid publisher listing |
| [Troubleshooting Java, Second Edition](https://www.manning.com/books/troubleshooting-java-second-edition) | Laurențiu Spilcă | Paid publisher listing |
| [Vert.x in Action](https://www.manning.com/books/vertx-in-action) | Julien Ponge | Paid publisher listing |

### JavaScript / TypeScript

| Title | Author | Access |
| --- | --- | --- |
| [Effective JavaScript](https://effectivejs.com/) | David Herman | Paid publisher listing |
| [Effective TypeScript](https://effectivetypescript.com/) | Dan Vanderkam | Paid publisher listing |
| [Eloquent JavaScript](https://eloquentjavascript.net/) | Marijn Haverbeke | Free online edition |
| [Express in Action](https://www.manning.com/books/express-in-action) | Evan M. Hahn | Paid publisher listing |
| [Functional Programming in JavaScript](https://www.manning.com/books/functional-programming-in-javascript) | Luis Atencio | Paid publisher listing |
| [JavaScript Allongé, the Six Edition](https://leanpub.com/javascriptallongesix/read) | Reg Braithwaite | Free online edition |
| [JavaScript Patterns](https://www.oreilly.com/library/view/javascript-patterns/9781449399115/) | Stoyan Stefanov | Paid publisher listing |
| [JavaScript: The Definitive Guide](https://www.oreilly.com/library/view/javascript-the-definitive/9781491952016/) | David Flanagan | Paid publisher listing |
| [JavaScript: The Good Parts](https://www.oreilly.com/library/view/javascript-the-good/9780596517748/) | Douglas Crockford | Paid publisher listing |
| [Learning React](https://www.oreilly.com/library/view/learning-react-2nd/9781492051718/) | Alex Banks and Eve Porcello | Paid publisher listing |
| [Learning TypeScript](https://www.learningtypescript.com/) | Josh Goldberg | Paid publisher listing |
| [Node.js Design Patterns](https://www.nodejsdesignpatterns.com/) | Mario Casciaro and Luciano Mammino | Paid publisher listing |
| [Node.js in Action](https://www.manning.com/books/node-js-in-action-second-edition) | Alex Young, Bradley Meck, and Mike Cantelon | Paid publisher listing |
| [Programming TypeScript](https://www.oreilly.com/library/view/programming-typescript/9781492037644/) | Boris Cherny | Paid publisher listing |
| [React Hooks in Action](https://www.manning.com/books/react-hooks-in-action) | John Larsen | Paid publisher listing |
| [React in Action](https://www.manning.com/books/react-in-action) | Mark Tielens Thomas | Paid publisher listing |
| [React Quickly](https://www.manning.com/books/react-quickly-second-edition) | Morten Barklund and Azat Mardan | Paid publisher listing |
| [RxJS in Action](https://www.manning.com/books/rxjs-in-action) | Paul P. Daniels and Luis Atencio | Paid publisher listing |
| [Secrets of the JavaScript Ninja](https://www.manning.com/books/secrets-of-the-javascript-ninja-second-edition) | John Resig, Bear Bibeault, and Josip Maras | Paid publisher listing |
| [Testing JavaScript Applications](https://www.manning.com/books/testing-javascript-applications) | Lucas da Costa | Paid publisher listing |
| [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/) | Basarat Ali Syed | Free online edition |
| [TypeScript Quickly](https://www.manning.com/books/typescript-quickly) | Yakov Fain and Anton Moiseev | Paid publisher listing |
| [Vue.js in Action](https://www.manning.com/books/vue-js-in-action) | Erik Hanchett and Benjamin Listwon | Paid publisher listing |
| [You Don't Know JS Yet: Get Started](https://github.com/getify/You-Dont-Know-JS/tree/2nd-ed/get-started) | Kyle Simpson | Free online edition |
| [You Don't Know JS Yet: Scope & Closures](https://github.com/getify/You-Dont-Know-JS/tree/2nd-ed/scope-closures) | Kyle Simpson | Free online edition |

### Kotlin

| Title | Author | Access |
| --- | --- | --- |
| [Atomic Kotlin](https://www.atomickotlin.com/) | Bruce Eckel, Svetlana Isakova | Paid publisher listing |
| [Functional Programming in Kotlin](https://www.manning.com/books/functional-programming-in-kotlin) | Marco Vermeulen, Rúnar Bjarnason, Paul Chiusano | Paid publisher listing |
| [Kotlin in Action, Second Edition](https://www.manning.com/books/kotlin-in-action-second-edition) | Sebastian Aigner, Roman Elizarov, Svetlana Isakova, Dmitry Jemerov | Paid publisher listing |
| [Programming Kotlin](https://pragprog.com/titles/vskotlin/programming-kotlin/) | Venkat Subramaniam | Paid publisher listing |
| [The Joy of Kotlin](https://www.manning.com/books/the-joy-of-kotlin) | Pierre-Yves Saumont | Paid publisher listing |

### Python

| Title | Author | Access |
| --- | --- | --- |
| [Architecture Patterns with Python](https://www.cosmicpython.com/) | Harry Percival and Bob Gregory | Free online edition |
| [Automate the Boring Stuff with Python](https://automatetheboringstuff.com/) | Al Sweigart | Free online edition |
| [Bayesian Modeling and Computation in Python](https://bayesiancomputationbook.com/welcome.html) | Osvaldo A. Martín, Ravin Kumar, and Junpeng Lao | Free online edition |
| [Beyond the Basic Stuff with Python](https://inventwithpython.com/beyond/) | Al Sweigart | Free online edition |
| [Cracking Codes with Python](https://inventwithpython.com/cracking/) | Al Sweigart | Free online edition |
| [Effective Python](https://effectivepython.com/) | Brett Slatkin | Paid publisher listing |
| [Fluent Python](https://www.oreilly.com/library/view/fluent-python-2nd/9781492056348/) | Luciano Ramalho | Paid publisher listing |
| [Impractical Python Projects](https://nostarch.com/impracticalpythonprojects) | Lee Vaughan | Paid publisher listing |
| [Invent Your Own Computer Games with Python](https://inventwithpython.com/invent4thed/) | Al Sweigart | Free online edition |
| [Making Games with Python & Pygame](https://inventwithpython.com/pygame/) | Al Sweigart | Free online edition |
| [Python Concurrency with asyncio](https://www.manning.com/books/python-concurrency-with-asyncio) | Matthew Fowler | Paid publisher listing |
| [Python Cookbook](https://www.oreilly.com/library/view/python-cookbook-3rd/9781449357337/) | David Beazley and Brian K. Jones | Paid publisher listing |
| [Python Crash Course](https://nostarch.com/python-crash-course-3rd-edition) | Eric Matthes | Paid publisher listing |
| [Python Data Science Handbook](https://jakevdp.github.io/PythonDataScienceHandbook/) | Jake VanderPlas | Free online edition |
| [Python Distilled](https://www.informit.com/store/python-distilled-9780134173276) | David M. Beazley | Paid publisher listing |
| [Python Testing with pytest](https://pragprog.com/titles/bopytest2/python-testing-with-pytest-second-edition/) | Brian Okken | Paid publisher listing |
| [Python Workout](https://www.manning.com/books/python-workout-second-edition) | Reuven M. Lerner | Paid publisher listing |
| [Real-World Python](https://nostarch.com/real-world-python) | Lee Vaughan | Paid publisher listing |
| [Serious Python](https://nostarch.com/seriouspython) | Julien Danjou | Paid publisher listing |
| [Test-Driven Development with Python](https://www.obeythetestinggoat.com/) | Harry J. W. Percival | Free online edition |
| [The Big Book of Small Python Projects](https://inventwithpython.com/bigbookpython/) | Al Sweigart | Free online edition |
| [The Recursive Book of Recursion](https://inventwithpython.com/recursion/) | Al Sweigart | Free online edition |
| [Think Bayes](https://allendowney.github.io/ThinkBayes2/) | Allen B. Downey | Free online edition |
| [Think Python](https://allendowney.github.io/ThinkPython/) | Allen B. Downey | Free online edition |
| [Think Stats](https://allendowney.github.io/ThinkStats/) | Allen B. Downey | Free online edition |

### Ruby

| Title | Author | Access |
| --- | --- | --- |
| [Eloquent Ruby](https://www.informit.com/store/eloquent-ruby-9780321584106) | Russ Olsen | Paid publisher listing |
| [Metaprogramming Ruby 2](https://pragprog.com/titles/ppmetr2/metaprogramming-ruby-2/) | Paolo Perrotta | Paid publisher listing |
| [Practical Object-Oriented Design](https://www.poodr.com/) | Sandi Metz | Paid publisher listing |
| [Programming Ruby](https://pragprog.com/titles/ruby5/programming-ruby-3-3-5th-edition/) | Noel Rappin with Dave Thomas | Paid publisher listing |
| [The Well-Grounded Rubyist](https://www.manning.com/books/the-well-grounded-rubyist-third-edition) | David A. Black and Joseph Leo III | Paid publisher listing |

### Software Engineering

| Title | Author | Access |
| --- | --- | --- |
| [A Philosophy of Software Design, Second Edition](https://web.stanford.edu/~ouster/cgi-bin/book.php) | John Ousterhout | Paid publisher listing |
| [Advanced Algorithms and Data Structures](https://www.manning.com/books/advanced-algorithms-and-data-structures) | Marcello La Rocca | Paid publisher listing |
| [Code That Fits in Your Head](https://www.informit.com/store/code-that-fits-in-your-head-heuristics-for-software-9780137464319) | Mark Seemann | Paid publisher listing |
| [Five Lines of Code](https://www.manning.com/books/five-lines-of-code) | Christian Clausen | Paid publisher listing |
| [Grokking Algorithms, Second Edition](https://www.manning.com/books/grokking-algorithms-second-edition) | Aditya Y Bhargava | Paid publisher listing |
| [Grokking Concurrency](https://www.manning.com/books/grokking-concurrency) | Kirill Bobrov | Paid publisher listing |
| [Grokking Data Structures](https://www.manning.com/books/grokking-data-structures) | Marcello La Rocca | Paid publisher listing |
| [Grokking Simplicity](https://www.manning.com/books/grokking-simplicity) | Eric Normand | Paid publisher listing |
| [Refactoring, Second Edition](https://martinfowler.com/books/refactoring.html) | Martin Fowler | Paid publisher listing |
| [Software Design for Flexibility](https://mitpress.mit.edu/9780262045490/software-design-for-flexibility/) | Chris Hanson, Gerald Jay Sussman | Free online edition |
| [Test-Driven Development: By Example](https://www.informit.com/store/test-driven-development-by-example-9780321146533) | Kent Beck | Paid publisher listing |
| [The Art of Unit Testing, Third Edition](https://www.manning.com/books/the-art-of-unit-testing-third-edition) | Roy Osherove with Vladimir Khorikov | Paid publisher listing |
| [The Pragmatic Programmer, 20th Anniversary Edition](https://pragprog.com/titles/tpp20/the-pragmatic-programmer-20th-anniversary-edition/) | David Thomas, Andrew Hunt | Paid publisher listing |
| [The Programmer's Brain](https://www.manning.com/books/the-programmers-brain) | Felienne Hermans | Paid publisher listing |
| [Unit Testing Principles, Practices, and Patterns](https://www.manning.com/books/unit-testing) | Vladimir Khorikov | Paid publisher listing |

### Swift

| Title | Author | Access |
| --- | --- | --- |
| [Classic Computer Science Problems in Swift](https://www.manning.com/books/classic-computer-science-problems-in-swift) | David Kopec | Paid publisher listing |
| [Hello Swift!](https://www.manning.com/books/hello-swift) | Tanmay Bakshi | Paid publisher listing |
| [iOS Development with Swift](https://www.manning.com/books/ios-development-with-swift) | Craig Grummitt | Paid publisher listing |
| [Swift in Depth](https://www.manning.com/books/swift-in-depth) | Tjeerd in 't Veen | Paid publisher listing |
| [The Swift Programming Language](https://www.swift.org/documentation/tspl/) | The Swift Project | Free online edition |

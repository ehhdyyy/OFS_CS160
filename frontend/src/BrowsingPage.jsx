import { useState, useMemo, useEffect } from "react";
import "./styles/browsing.css";

const API_BASE = "http://localhost:8000"

export default function BrowsingPage(){

    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");


    const [filters, setFilters] = useState({
        category: [],
        search: "",
        priceRange: "all",
        weightRange: "all",
        availability: "all",
    });

    const [cart, setCart] = useState([]);

    useEffect(() => {
        async function loadProducts() {
            try {
                setIsLoading(true);
                setErrorMessage("");

                const res = await fetch(`${API_BASE}/api/products`, {
                    credentials: "include",
                });

                if(!res.ok){
                    throw new Error(`Failed to load products (${res.status})`)
                }

                const data = await res.json();
                setProducts(data);
            }catch (err){
                setErrorMessage(err.message);
            }finally{
                setIsLoading(false);
            }
        }

        loadProducts();
    }, []);

    function toggleCategory(category){
        setFilters((prev) => {
            const exists = prev.category.includes(category);
            return {
                ...prev,
                category: exists ? prev.category.filter((c) => c !== category)
                : [...prev.category, category],
            };
        });   
    }
    
    function matchesPriceRange(price, range) {
        if (range === "all") return true;
        if (range === "under5") return price < 5;
        if (range === "5to10") return price >= 5 && price <= 10;
        if (range === "over10") return price > 10;
        return true;
    }

  function matchesWeightRange(weight_lbs, range) {
        if (range === "all") return true;
        if (range === "under1") return weight_lbs < 1;
        if (range === "1to10") return weight_lbs >= 1 && weight_lbs <= 10;
        if (range === "over10") return weight_lbs > 10;
        return true;
    }

   const filteredProducts = useMemo(() => {
    return products.filter((product) => {
        const matchesSearch = 
            product.name.toLowerCase().includes(filters.search.toLowerCase());

        const matchesCategory = 
            filters.category.length === 0 || 
            filters.category.includes(product.category);

        const matchesAvability = 
            filters.availability === "all" || 
            (filters.availability === "stocked" && product.is_available);

        const matchesPrice = matchesPriceRange(product.price, filters.priceRange);

        const matchesWeight = matchesWeightRange(product.weight_lbs, filters.weightRange);
        
        return (
            matchesSearch &&
            matchesCategory &&
            matchesPrice &&
            matchesWeight &&
            matchesAvability
        );
    });
   }, [products, filters]);

    return(
        <>
            {/* Navbar */}
            <nav className="navbar">
                <a className="navbar-logo" href="/home">
                <div className="logo-icon">🛒</div>
                <span className="logo-text">OFS</span>
                </a>
                <ul className="navbar-links">
                <li><a href="/home">Home</a></li>
                <li><a href="/shop">Shop</a></li>
                <li><a href="/about">About</a></li>
                <li><a href="/contact">Contact</a></li>
                </ul>

                <button className="profile-btn" type="button">
                    <img
                        alt="Profile"
                        className = "profile-avatar"
                    ></img>
                </button>
            </nav>

            <div className="browse-page">

                <aside className = "filter-panel">
                    

                    <div className="filter-section">
                        <h3>Categories</h3>
                        <label>
                            <input 
                                type="checkbox"
                                checked={filters.category.includes("Fruit")}
                                onChange={() => toggleCategory("Fruit")} 
                            />
                            Fruits
                        </label>

                        <label>
                            <input 
                                type="checkbox"
                                checked={filters.category.includes("Vegetables")}
                                onChange={() => toggleCategory("Vegetables")} 
                            />
                            Vegetables
                        </label>

                        <label>
                            <input 
                                type="checkbox"
                                checked={filters.category.includes("Pantry")}
                                onChange={() => toggleCategory("Pantry")} 
                            />
                            Pantry
                        </label>

                        <label>
                            <input 
                                type="checkbox"
                                checked={filters.category.includes("Drinks")}
                                onChange={() => toggleCategory("Drinks")} 
                            />
                            Drinks
                        </label>

                        <label>
                            <input 
                                type="checkbox"
                                checked={filters.category.includes("Dairy")}
                                onChange={() => toggleCategory("Dairy")} 
                            />
                            Dairy
                        </label>
                    </div>
                    <div className="filter-section">
                        
                        <h3>Price Range</h3>

                        <label>
                            <input 
                                type="radio"
                                name="priceRange"
                                checked={filters.priceRange === "all"}
                                onChange={() => 
                                    setFilters((prev) => ({ ...prev, priceRange: "all"}))
                                } 
                            />
                            All
                        </label>

                        <label>
                            <input
                                type="radio"
                                name="priceRange"
                                checked={filters.priceRange === "under5"}
                                onChange={() =>
                                setFilters((prev) => ({ ...prev, priceRange: "under5" }))
                                }
                            />
                            Under $5
                        </label>

                        <label>
                            <input
                                type="radio"
                                name="priceRange"
                                checked={filters.priceRange === "5to10"}
                                onChange={() =>
                                setFilters((prev) => ({ ...prev, priceRange: "5to10" }))
                                }
                            />
                            $5 - $10
                        </label>

                        <label>
                            <input
                                type="radio"
                                name="priceRange"
                                checked={filters.priceRange === "over10"}
                                onChange={() =>
                                setFilters((prev) => ({ ...prev, priceRange: "over10" }))
                                }
                            />
                            Over $10
                        </label>
                    </div>

                    <div className="filter-section">
                        <h3>Weight Range</h3>

                        <label>
                            <input
                                type="radio"
                                name="weightRange"
                                checked={filters.weightRange === "all"}
                                onChange={() =>
                                setFilters((prev) => ({ ...prev, weightRange: "all" }))
                                }
                            />
                            All
                        </label>

                        <label>
                            <input
                                type="radio"
                                name="weightRange"
                                checked={filters.weightRange === "under1"}
                                onChange={() =>
                                setFilters((prev) => ({ ...prev, weightRange: "under1" }))
                                }
                            />
                            Under 1 lb
                        </label>

                        <label>
                            <input
                                type="radio"
                                name="weightRange"
                                checked={filters.weightRange === "1to10"}
                                onChange={() =>
                                setFilters((prev) => ({ ...prev, weightRange: "1to10" }))
                                }
                            />
                            1 - 10 lb
                        </label>

                        <label>
                            <input
                                type="radio"
                                name="weightRange"
                                checked={filters.weightRange === "over10"}
                                onChange={() =>
                                setFilters((prev) => ({ ...prev, weightRange: "over10" }))
                                }
                            />
                            Over 10 lb
                        </label>
                    </div>

                    <div className="filter-section">
                        <h3>Availability</h3>

                        <label>
                            <input
                                type="radio"
                                name="availability"
                                checked={filters.availability === "all"}
                                onChange={() =>
                                setFilters((prev) => ({ ...prev, availability: "all" }))
                                }
                            />
                            All
                        </label>

                        <label>
                            <input
                                type="radio"
                                name="availability"
                                checked={filters.availability === "stocked"}
                                onChange={() =>
                                setFilters((prev) => ({ ...prev, availability: "stocked" }))
                                }
                            />
                            Stocked
                        </label>
                    </div>

                </aside>
                
                <main className="inventory-panel">
                    <div className="inventory-topbar">
                        <input
                            type="text"
                            placeholder="Search for products..."
                            value={filters.search}
                            onChange={(e) => 
                                setFilters((prev) => ({ ...prev, search: e.target.value}))
                            }
                        />
                    </div>

                    <div className="product-grid">
                        {filteredProducts.map((product) => (
                            <div className="product-card" key={product.id}>
                                <img src={product.image} alt={product.name} />
                                <p className="product-category">{product.category}</p>
                                <h3>{product.name}</h3>
                                <p className="product-weight">{product.weight_lbs +" lbs"}</p>
                                <div className="product-bottom">
                                    <span className="product-price">
                                        ${product.price.toFixed(2)}
                                    </span>
                                    <button
                                        onClick={() => addToCart(product)}
                                        disabled={!product.is_available}
                                    >
                                    +
                                    </button>
                                </div>
                            </div>
                        ))}
                        </div>
                </main>
                
            </div>
        </>
    );

}


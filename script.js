document.addEventListener('DOMContentLoaded', function() {
    // Header scroll effect
    const header = document.getElementById('header');
    let lastScrollTop = 0;
    
    window.addEventListener('scroll', function() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        if (scrollTop > 100) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
        
        lastScrollTop = scrollTop;
    });

    // Mobile menu toggle with improved UX
    const menuToggle = document.getElementById('menuToggle');
    const nav = document.querySelector('nav');
    const body = document.body;
    
    menuToggle.addEventListener('click', function() {
        nav.classList.toggle('active');
        body.style.overflow = nav.classList.contains('active') ? 'hidden' : '';
        
        // Animate menu toggle icon
        const icon = this.querySelector('i');
        if (nav.classList.contains('active')) {
            icon.className = 'fas fa-times';
        } else {
            icon.className = 'fas fa-bars';
        }
    });

    // Close mobile menu when clicking outside
    document.addEventListener('click', function(e) {
        if (!nav.contains(e.target) && !menuToggle.contains(e.target) && nav.classList.contains('active')) {
            nav.classList.remove('active');
            body.style.overflow = '';
            menuToggle.querySelector('i').className = 'fas fa-bars';
        }
    });

    // GitHub API configuration
    const GITHUB_API_BASE = 'https://api.github.com';
    const ORGANIZATION = 'NIBM-Workshops';
    
    // Workshop data structure
    let workshops = {
        upcoming: [],
        past: []
    };

    // Fetch repositories from GitHub organization
    async function fetchRepositories() {
        try {
            const response = await fetch(`${GITHUB_API_BASE}/orgs/${ORGANIZATION}/repos?per_page=100&sort=updated`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'NIBM-Workshops-Website'
                }
            });
            
            console.log('GitHub API Response Status:', response.status);
            console.log('GitHub API Response Headers:', response.headers);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('GitHub API Error Response:', errorText);
                
                // Check if it's a rate limit error
                if (response.status === 403 && errorText.includes('rate limit')) {
                    console.log('Rate limit exceeded, using fallback repository list');
                    return getFallbackRepositories();
                }
                
                throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
            }
            
            const repos = await response.json();
            console.log('Fetched repositories:', repos.map(r => r.name));
            return repos;
        } catch (error) {
            console.error('Error fetching repositories:', error);
            console.log('Using fallback repository list due to error');
            return getFallbackRepositories();
        }
    }

    // Fallback repository list when GitHub API is rate limited
    function getFallbackRepositories() {
        console.log('Using fallback repository list');
        return [
            { name: 'Git-Github' },
            { name: 'NIBM-Workshops.github.io' }
            // Add more repositories as needed
        ];
    }

    // Function to manually add a repository to test
    window.addRepositoryToTest = function(repoName) {
        console.log(`Adding repository to test: ${repoName}`);
        const testRepo = { name: repoName };
        const testWorkshop = parseWorkshopFromReadme('', repoName); // Will fetch README separately
        console.log(`Test workshop object for ${repoName}:`, testWorkshop);
        
        // Fetch README for this specific repository
        fetchReadme(repoName).then(content => {
            if (content) {
                const workshop = parseWorkshopFromReadme(content, repoName);
                console.log(`Parsed workshop for ${repoName}:`, workshop);
                
                // Add to workshops list
                if (workshop.category === 'upcoming') {
                    workshops.upcoming.push(workshop);
                } else {
                    workshops.past.push(workshop);
                }
                
                // Refresh display
                displayWorkshops(workshops.upcoming, 'upcomingWorkshops');
                displayWorkshops(workshops.past, 'pastWorkshops', false);
            }
        });
    };

    // Fetch README content from a repository using raw GitHub URL
    async function fetchReadme(repoName) {
        try {
            // Try main branch first with cache busting
            let rawUrl = `https://raw.githubusercontent.com/${ORGANIZATION}/${repoName}/main/README.md?t=${Date.now()}`;
            console.log(`Fetching README from: ${rawUrl}`);
            
            let response = await fetch(rawUrl);
            
            // If main branch doesn't work, try master branch
            if (!response.ok) {
                console.log(`Main branch failed, trying master branch for ${repoName}`);
                rawUrl = `https://raw.githubusercontent.com/${ORGANIZATION}/${repoName}/master/README.md?t=${Date.now()}`;
                response = await fetch(rawUrl);
            }
            
            // If still not found, try README.md in root
            if (!response.ok) {
                console.log(`Master branch failed, trying root README for ${repoName}`);
                rawUrl = `https://raw.githubusercontent.com/${ORGANIZATION}/${repoName}/README.md?t=${Date.now()}`;
                response = await fetch(rawUrl);
            }
            
            if (!response.ok) {
                console.log(`No README found for ${repoName} (Status: ${response.status})`);
                return null;
            }
            
            const content = await response.text();
            console.log(`README content for ${repoName}:`, content.substring(0, 200) + '...');
            return content;
        } catch (error) {
            console.error(`Error fetching README for ${repoName}:`, error);
            return null;
        }
    }

    // Parse workshop information from README content
    function parseWorkshopFromReadme(readmeContent, repoName) {
        const workshop = {
            id: repoName,
            title: repoName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            category: 'technology', // default category
            date: null,
            time: '',
            venue: '',
            description: '',
            instructor: '',
            image: `https://source.unsplash.com/random/600x400/?${repoName}`,
            duration: '1 day',
            level: 'All Levels',
            repoUrl: `https://github.com/${ORGANIZATION}/${repoName}`,
            readmeUrl: `https://github.com/${ORGANIZATION}/${repoName}#readme`,
            whyAttend: [],
            featuredExperts: [],
            hostedBy: '',
            registrationLink: ''
        };

        // Extract workshop title from the first heading
        const titleMatch = readmeContent.match(/^#\s+(.+?)(?:\s*🚀)?$/m);
        if (titleMatch) {
            workshop.title = titleMatch[1].trim();
        }

        // Extract description from the first paragraph after the title
        const descriptionMatch = readmeContent.match(/\*\*(.+?)\*\*\s*(.+?)(?=\n\n|\n##|\n#)/s);
        if (descriptionMatch) {
            workshop.description = (descriptionMatch[1] + ' ' + descriptionMatch[2]).trim();
        }

        // Extract image from markdown image syntax
        const imageMatch = readmeContent.match(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/);
        if (imageMatch) {
            workshop.image = imageMatch[1];
        }

        // Extract event details (new format)
        const eventDetailsMatch = readmeContent.match(/## 📅 Event Details\s*\n((?:- \*\*.*?\*\*.*?\n?)+)/s);
        if (eventDetailsMatch) {
            const eventDetailsText = eventDetailsMatch[1];
            console.log('Event Details Text:', eventDetailsText);
            
            // Extract date - fixed regex to match exact format
            const dateMatch = eventDetailsText.match(/- \*\*Date:\*\* (.*?)(?=\n|$)/);
            if (dateMatch) {
                const dateText = dateMatch[1].trim();
                workshop.date = dateText; // Store the original date text
                console.log('Extracted Date:', dateText);
                
                // Also parse for internal date logic (upcoming/past categorization)
                const datePatterns = [
                    /(\d{1,2})(?:st|nd|rd|th)?\s+(\w+)\s+(\d{4})/i, // 15th August 2025
                    /(\w{3}\s+\d{1,2},?\s+\d{4})/i, // Aug 15, 2025
                    /(\d{4}-\d{2}-\d{2})/, // 2025-08-15
                    /(\d{1,2}\/\d{1,2}\/\d{4})/, // 15/08/2025
                ];
                
                for (const pattern of datePatterns) {
                    const match = dateText.match(pattern);
                    if (match) {
                        try {
                            const parsedDate = new Date(dateText);
                            if (!isNaN(parsedDate.getTime())) {
                                workshop.internalDate = parsedDate.toISOString().split('T')[0]; // For internal logic only
                                console.log('Parsed Internal Date:', workshop.internalDate);
                                break;
                            }
                        } catch (e) {
                            // Continue to next pattern
                        }
                    }
                }
            } else {
                console.log('No date match found in event details');
            }
            
            // Extract time - fixed regex
            const timeMatch = eventDetailsText.match(/- \*\*Time:\*\* (.*?)(?=\n|$)/);
            if (timeMatch) {
                workshop.time = timeMatch[1].trim();
                console.log('Extracted Time:', workshop.time);
            } else {
                console.log('No time match found in event details');
            }
            
            // Extract venue - fixed regex
            const venueMatch = eventDetailsText.match(/- \*\*Venue:\*\* (.*?)(?=\n|$)/);
            if (venueMatch) {
                workshop.venue = venueMatch[1].trim();
                console.log('Extracted Venue:', workshop.venue);
            } else {
                console.log('No venue match found in event details');
            }
        } else {
            console.log('No event details section found in README');
            console.log('Available sections:', readmeContent.match(/## .*/g));
        }

        // Extract featured experts
        const expertsMatch = readmeContent.match(/## 👨‍💻 Featured Experts\s*\n((?:- \*\*.*?\*\*.*?\n?)+)/s);
        if (expertsMatch) {
            const expertsText = expertsMatch[1];
            const expertMatches = expertsText.matchAll(/- \*\*(.*?)\*\* \((.*?)\)/g);
            for (const match of expertMatches) {
                workshop.featuredExperts.push({
                    name: match[1].trim(),
                    role: match[2].trim()
                });
            }
            // Set the first expert as the main instructor
            if (workshop.featuredExperts.length > 0) {
                workshop.instructor = workshop.featuredExperts[0].name;
            }
        }

        // Extract "Why Attend" points
        const whyAttendMatch = readmeContent.match(/## 🔥 Why Attend\?\s*\n((?:- \*\*.*?\*\*.*?\n?)+)/s);
        if (whyAttendMatch) {
            const whyAttendText = whyAttendMatch[1];
            const pointMatches = whyAttendText.matchAll(/- \*\*(.*?)\*\* (.*?)(?=\n-|\n$)/g);
            for (const match of pointMatches) {
                workshop.whyAttend.push({
                    title: match[1].trim(),
                    description: match[2].trim()
                });
            }
        }

        // Extract hosted by information
        const hostedByMatch = readmeContent.match(/## 📍 Hosted by\s*\n\*\*(.*?)\*\*/s);
        if (hostedByMatch) {
            workshop.hostedBy = hostedByMatch[1].trim();
        }

        // Extract registration link
        const registrationMatch = readmeContent.match(/\[Register Now\]\((https?:\/\/[^\s)]+)\)/);
        if (registrationMatch) {
            workshop.registrationLink = registrationMatch[1];
        }

        // Extract duration from content (look for patterns like "3 hours", "2 days", etc.)
        const durationMatch = readmeContent.match(/(\d+)\s+(hours?|days?|weeks?)/i);
        if (durationMatch) {
            const number = durationMatch[1];
            const unit = durationMatch[2].toLowerCase();
            workshop.duration = `${number} ${unit}`;
        }

        // Extract level from content
        if (readmeContent.toLowerCase().includes('beginner')) {
            workshop.level = 'Beginner';
        } else if (readmeContent.toLowerCase().includes('intermediate')) {
            workshop.level = 'Intermediate';
        } else if (readmeContent.toLowerCase().includes('advanced')) {
            workshop.level = 'Advanced';
        } else {
            workshop.level = 'All Levels';
        }

        // Determine category based on content
        const content = readmeContent.toLowerCase();
        if (content.includes('git') || content.includes('version control') || content.includes('programming')) {
            workshop.category = 'technology';
        } else if (content.includes('business') || content.includes('management') || content.includes('marketing')) {
            workshop.category = 'business';
        } else if (content.includes('design') || content.includes('ui') || content.includes('ux')) {
            workshop.category = 'design';
        } else if (content.includes('research') || content.includes('academic')) {
            workshop.category = 'research';
        }

        // If no description found, use a default one
        if (!workshop.description) {
            workshop.description = `Join our ${workshop.title} workshop to enhance your skills and knowledge.`;
        }

        // If no instructor found, use a default one
        

        // Determine if workshop is upcoming or past
        if (workshop.internalDate) {
            const workshopDate = new Date(workshop.internalDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (workshopDate >= today) {
                workshop.category = 'upcoming';
            } else {
                workshop.category = 'past';
            }
        } else {
            // If no date found, assume it's upcoming but don't set a default date
            workshop.category = 'upcoming';
            if (!workshop.date) {
                workshop.date = 'TBD';
            }
        }

        return workshop;
    }

    // Load workshops from GitHub repositories
    async function loadWorkshopsFromGitHub() {
        const upcomingContainer = document.getElementById('upcomingWorkshops');
        const pastContainer = document.getElementById('pastWorkshops');

        // Show loading state
        upcomingContainer.innerHTML = '<div class="loading-container"><div class="loading"></div><p>Loading workshops from GitHub...</p></div>';
        pastContainer.innerHTML = '<div class="loading-container"><div class="loading"></div><p>Loading past workshops...</p></div>';

        try {
            console.log('Starting to fetch repositories from GitHub...');
            const repos = await fetchRepositories();
            
            if (repos.length === 0) {
                console.log('No repositories found');
                upcomingContainer.innerHTML = `
                    <div class="no-workshops">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h3>No repositories found</h3>
                        <p>Unable to load workshops from GitHub. Please check your internet connection.</p>
                    </div>
                `;
                pastContainer.innerHTML = `
                    <div class="no-workshops">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h3>No repositories found</h3>
                        <p>Unable to load workshops from GitHub. Please check your internet connection.</p>
                    </div>
                `;
                return;
            }

            console.log(`Found ${repos.length} repositories:`, repos.map(r => r.name));

            // Fetch README for each repository
            const workshopPromises = repos.map(async (repo) => {
                console.log(`Fetching README for repository: ${repo.name}`);
                const readmeContent = await fetchReadme(repo.name);
                if (readmeContent) {
                    const workshop = parseWorkshopFromReadme(readmeContent, repo.name);
                    console.log(`Parsed workshop for ${repo.name}:`, workshop);
                    
                    // Only return workshops that have meaningful content
                    if (workshop.title && (workshop.description || workshop.date || workshop.time || workshop.venue)) {
                        console.log(`✅ ${repo.name} contains workshop content`);
                        return workshop;
                    } else {
                        console.log(`❌ Skipping ${repo.name} - no workshop content found`);
                        return null;
                    }
                }
                console.log(`No README content found for ${repo.name}`);
                return null;
            });

            const workshopResults = await Promise.all(workshopPromises);
            const validWorkshops = workshopResults.filter(workshop => workshop !== null);
            
            console.log(`Successfully parsed ${validWorkshops.length} workshops:`, validWorkshops);

            // Separate upcoming and past workshops
            workshops.upcoming = validWorkshops.filter(workshop => workshop.category === 'upcoming');
            workshops.past = validWorkshops.filter(workshop => workshop.category === 'past');

            console.log(`Upcoming workshops: ${workshops.upcoming.length}`, workshops.upcoming);
            console.log(`Past workshops: ${workshops.past.length}`, workshops.past);

            // Display workshops
            displayWorkshops(workshops.upcoming, 'upcomingWorkshops');
            displayWorkshops(workshops.past, 'pastWorkshops', false);

        } catch (error) {
            console.error('Error loading workshops:', error);
            upcomingContainer.innerHTML = `
                <div class="no-workshops">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Error loading workshops</h3>
                    <p>There was an error loading workshops from GitHub. Please try again later.</p>
                    <p><small>Error: ${error.message}</small></p>
                </div>
            `;
            pastContainer.innerHTML = `
                <div class="no-workshops">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Error loading workshops</h3>
                    <p>There was an error loading workshops from GitHub. Please try again later.</p>
                    <p><small>Error: ${error.message}</small></p>
                </div>
            `;
        }
    }

    // Enhanced workshop display with loading states and animations
    function displayWorkshops(workshops, containerId, isUpcoming = true) {
        const container = document.getElementById(containerId);
            
            if (workshops.length === 0) {
                container.innerHTML = `
                    <div class="no-workshops">
                        <i class="fas fa-search"></i>
                        <h3>No workshops found</h3>
                    <p>${isUpcoming ? 'No upcoming workshops scheduled at the moment.' : 'No past workshops found.'}</p>
                    </div>
                `;
                return;
            }
        
        container.innerHTML = '';
            
            workshops.forEach((workshop, index) => {
                const workshopCard = document.createElement('div');
                workshopCard.className = 'workshop-card';
                workshopCard.style.animationDelay = `${index * 0.1}s`;
                
                        const formattedDate = workshop.date || 'TBD';
            console.log('Displaying workshop:', workshop.title);
            console.log('Date to display:', formattedDate);
            console.log('Time to display:', workshop.time);
            console.log('Venue to display:', workshop.venue);
                
                workshopCard.innerHTML = `
                    <div class="workshop-image">
                        <img src="${workshop.image}" alt="${workshop.title}" loading="lazy">
                        <div class="workshop-overlay">
                            <span class="workshop-duration"><i class="fas fa-clock"></i> ${workshop.duration}</span>
                            <span class="workshop-level"><i class="fas fa-signal"></i> ${workshop.level}</span>
                        </div>
                    </div>
                    <div class="workshop-content">
                        <span class="workshop-category ${workshop.category}">
                            <i class="fas fa-${getCategoryIcon(workshop.category)}"></i>
                            ${workshop.category.charAt(0).toUpperCase() + workshop.category.slice(1)}
                        </span>
                        <h3 class="workshop-title">${workshop.title}</h3>
                        <div class="workshop-date">
                            <i class="far fa-calendar-alt"></i>
                            ${formattedDate}
                    </div>
                    ${workshop.time || workshop.venue ? `
                        <div class="workshop-event-details">
                            ${workshop.time ? `<div class="event-time"><i class="far fa-clock"></i> ${workshop.time}</div>` : ''}
                            ${workshop.venue ? `<div class="event-venue"><i class="fas fa-map-marker-alt"></i> ${workshop.venue}</div>` : ''}
                        </div>
                    ` : ''}
                        <p class="workshop-description">${workshop.description}</p>
                    ${workshop.featuredExperts.length > 0 ? `
                        <div class="workshop-experts">
                            <strong><i class="fas fa-users"></i> Featured Experts:</strong>
                            ${workshop.featuredExperts.map(expert => 
                                `<span class="expert-tag">${expert.name} (${expert.role})</span>`
                            ).join(', ')}
                        </div>
                    ` : ''}
                    ${workshop.whyAttend.length > 0 ? `
                        <div class="workshop-highlights">
                            <strong><i class="fas fa-star"></i> Key Benefits:</strong>
                            <ul>
                                ${workshop.whyAttend.slice(0, 2).map(point => 
                                    `<li>${point.title}: ${point.description}</li>`
                                ).join('')}
                            </ul>
                        </div>
                    ` : ''}
                        <div class="workshop-footer">
                            <div class="workshop-actions">
                                ${isUpcoming ? 
                                    (workshop.registrationLink ? 
                                        `<a href="${workshop.registrationLink}" class="btn btn-success" target="_blank" rel="noopener">
                                            <i class="fas fa-user-plus"></i> Register Now
                                        </a>` :
                                        `<button class="btn btn-success" onclick="registerWorkshop('${workshop.id}')">
                                        <i class="fas fa-user-plus"></i> Register
                                        </button>`
                                    ) : 
                                    `<button class="btn btn-outline" disabled>
                                        <i class="fas fa-check-circle"></i> Completed
                                    </button>`
                                }
                                <a href="${workshop.repoUrl}" class="btn btn-outline" target="_blank" rel="noopener">
                                    <i class="fab fa-github"></i> View Details
                                </a>
                            </div>
                        </div>
                    </div>
                `;
                
                container.appendChild(workshopCard);
            });
    }

    // Get category icon
    function getCategoryIcon(category) {
        const icons = {
            technology: 'laptop-code',
            business: 'briefcase',
            design: 'palette',
            research: 'microscope',
            upcoming: 'calendar-alt',
            past: 'history'
        };
        return icons[category] || 'book';
    }

    // Enhanced filter function with debouncing
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    function filterWorkshops(workshops, category, searchTerm = '') {
        return workshops.filter(workshop => {
            const matchesCategory = category === 'all' || workshop.category === category;
            const matchesSearch = searchTerm === '' || 
                workshop.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                workshop.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                workshop.instructor.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesCategory && matchesSearch;
        });
    }

    // Load workshops from GitHub on page load
    loadWorkshopsFromGitHub();
    
    // Add a refresh button for manual reloading
    window.refreshWorkshops = function() {
        console.log('Manually refreshing workshops...');
        loadWorkshopsFromGitHub();
    };
});

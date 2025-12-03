import React from 'react';
import Navbar from '../../components/landing/Navbar';
import Hero from '../../components/landing/Hero';
import Features from '../../components/landing/Features';
import HowItWorks from '../../components/landing/HowItWorks';
import Pricing from '../../components/landing/Pricing';
import Footer from '../../components/landing/Footer';
import ParticlesBackground from '../../components/landing/ParticlesBackground';
import './LandingPage.css';

const LandingPage = () => {
    return (
        <div className="landing-page">
            <ParticlesBackground />
            <Navbar />
            <Hero />
            <Features />
            <HowItWorks />
            <Pricing />
            <Footer />
        </div>
    );
};

export default LandingPage;

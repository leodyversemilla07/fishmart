# Fishmart - Project Documentation

## Project Overview

**Fishmart** is a mobile e-commerce application for buying and selling guppies and small fish in the Philippines. The app connects fish breeders with buyers, providing a seamless marketplace experience optimized for the local market.

## Target Market
- **Primary**: Guppy and small fish enthusiasts in the Philippines
- **Geographic Focus**: Metro Manila initially, expanding to provincial areas
- **User Types**: 
  - Buyers (hobbyists, new aquarium owners)
  - Sellers (breeders, small fish farms)
  - Admins (marketplace operators)

## Key Features

### Phase 1 (MVP)
- User registration and authentication (Email, Google, Facebook, Phone)
- Fish product listings with images and details
- Product categories and search functionality
- Shopping cart and checkout
- Multiple payment options (GCash, Maya, Cards, COD)
- Order management and tracking
- Push notifications for order updates
- SMS notifications for critical updates
- User profiles (buyer and seller)
- Basic admin panel

### Phase 2 (Future)
- In-app messaging between buyers and sellers
- Rating and review system
- Fish care guides and compatibility checker
- Breeding pair recommendations
- Live inventory updates
- Delivery scheduling integration
- Loyalty program
- Aquarium supplies expansion

## Technical Stack

### Mobile Application
- **Framework**: React Native 0.76+ with Expo
- **Language**: TypeScript
- **UI Library**: React Native Paper
- **State Management**: Zustand
- **API Communication**: React Query (TanStack Query)
- **Navigation**: React Navigation

### Backend
- **Framework**: NestJS
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: Supabase Auth
- **API Style**: RESTful API

### Infrastructure & Services
- **Database Hosting**: Supabase
- **Backend Hosting**: Railway (Singapore region)
- **File Storage**: Cloudinary
- **Payment Gateway**: PayMongo
- **Push Notifications**: Firebase Cloud Messaging (FCM)
- **SMS Service**: Semaphore
- **Version Control**: Git + GitHub

## Documentation Structure

1. **[System Architecture](fishmart_architecture)** - High-level system design and component interactions
2. **[Database Schema](fishmart_database)** - Complete database structure and relationships
3. **[API Documentation](fishmart_api)** - Backend API endpoints and specifications
4. **[Frontend Setup Guide](fishmart_frontend_setup)** - Mobile app development environment setup
5. **[Backend Setup Guide](fishmart_backend_setup)** - Server setup and configuration
6. **[Deployment Guide](fishmart_deployment)** - Production deployment procedures
7. **[Development Workflow](fishmart_workflow)** - Git workflow and best practices
8. **[Testing Strategy](fishmart_testing)** - Testing approach and guidelines

## Project Timeline (Estimated)

### Month 1: Foundation
- Week 1-2: Development environment setup, database design
- Week 3-4: Authentication system, basic UI components

### Month 2: Core Features
- Week 1-2: Product listings, search, and categories
- Week 3-4: Shopping cart and checkout flow

### Month 3: Integration & Testing
- Week 1-2: Payment integration, order management
- Week 3-4: Testing, bug fixes, admin panel

### Month 4: Launch Preparation
- Week 1-2: Beta testing with selected users
- Week 3-4: Final adjustments, app store submission, soft launch

## Team Roles (Recommended)

- **1 Full-Stack Developer**: Backend + Frontend
- **1 Mobile Developer**: React Native specialist (can be same as full-stack)
- **1 UI/UX Designer**: App design and user experience
- **1 Product Manager/Owner**: Requirements, testing, business logic
- **1 QA Tester**: Testing and quality assurance (can be part-time)

## Budget Estimate

### Development (One-time)
- Development: ₱300,000 - ₱500,000 (depending on team rates)
- Design: ₱50,000 - ₱100,000
- Testing: ₱30,000 - ₱50,000

### Monthly Operations
- Hosting (Railway): ₱500 - ₱2,000
- Database (Supabase): Free tier initially, ₱1,000+ when scaling
- Cloudinary: Free tier initially, ₱500+ when scaling
- PayMongo: Transaction fees only (3.5% + ₱15 per transaction)
- SMS (Semaphore): ₱500 - ₱2,000 (depending on volume)
- Firebase: Free tier initially
- **Total**: ₱1,500 - ₱5,000/month initially

### App Store Fees
- Google Play Store: $25 one-time fee
- Apple App Store: $99/year

## Success Metrics

### Key Performance Indicators (KPIs)
- Daily Active Users (DAU)
- Monthly Active Users (MAU)
- Conversion Rate (visitors to buyers)
- Average Order Value (AOV)
- Customer Acquisition Cost (CAC)
- Customer Lifetime Value (CLV)
- App Store Rating
- Order Completion Rate
- Payment Success Rate

## Risks & Mitigation

### Technical Risks
- **Risk**: Live fish shipping complexity
- **Mitigation**: Partner with experienced logistics providers, clear delivery guidelines

- **Risk**: Payment gateway issues
- **Mitigation**: Implement proper error handling, provide alternative payment methods

- **Risk**: Inventory management (fish sold out)
- **Mitigation**: Real-time inventory updates, overselling prevention

### Business Risks
- **Risk**: Limited market size
- **Mitigation**: Expand to other aquarium products, build community features

- **Risk**: Competition from Facebook groups
- **Mitigation**: Better user experience, trust system, convenient payments

## Legal & Compliance

### Required Registrations
- DTI Business Name Registration or SEC Corporation Registration
- Mayor's Permit
- BIR Registration (TIN)
- Barangay Clearance

### Data Privacy
- Comply with Data Privacy Act of 2012
- Implement proper data security measures
- Clear privacy policy and terms of service

### E-Commerce Requirements
- DTI E-Commerce registration
- Consumer Act compliance
- Clear return and refund policies

## Contact & Support

- **Project Repository**: [GitHub URL]
- **Documentation**: [Documentation URL]
- **Issue Tracking**: GitHub Issues
- **Team Communication**: Slack/Discord

---

**Document Version**: 1.0  
**Last Updated**: December 23, 2025  
**Next Review**: January 2026
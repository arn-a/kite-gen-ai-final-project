import sample1 from "@/assets/sample-1.jpg";
import sample2 from "@/assets/sample-2.jpg";
import sample3 from "@/assets/sample-3.jpg";
import sample4 from "@/assets/sample-4.jpg";
import sample5 from "@/assets/sample-5.jpg";
import sample6 from "@/assets/sample-6.jpg";

export type PostType = "Product Showcase" | "Educational" | "Catalogue" | "Behind the Scenes" | "Styling Tips";
export type Platform = "Instagram";
export type PostStatus = "Draft" | "Approved" | "Rejected" | "Scheduled" | "Published";

export interface Post {
  id: string;
  image: string;
  caption: string;
  type: PostType;
  platform: Platform;
  status: PostStatus;
  scheduledFor: string;
  color: "gold" | "blush" | "sage" | "rose" | "cream" | "charcoal";
}

const today = new Date();
const yyyy = today.getFullYear();
const mm = today.getMonth();
const day = (d: number, hour = 9) => new Date(yyyy, mm, d, hour, 0).toISOString();

export const seedPosts: Post[] = [
  {
    id: "p1",
    image: sample1,
    caption:
      "Where tradition meets modern elegance. Our handcrafted Silk Anarkali features intricate gold threadwork passed down through generations. Limited to 25 pieces this season.\n\n#AmyrahLuxe #EthnicWear #SilkAnarkali #LuxuryFashion #Handcrafted",
    type: "Product Showcase",
    platform: "Instagram",
    status: "Draft",
    scheduledFor: day(3, 10),
    color: "gold",
  },
  {
    id: "p2",
    image: sample2,
    caption:
      "The fabric speaks before you do. Pure Chanderi silk catches light differently at every angle — here's why it's been royalty's choice for centuries, and how to style it for a modern soirée.\n\n#FabricGuide #Chanderi #StylingTips #AmyrahLuxe #EthnicLuxury",
    type: "Educational",
    platform: "Instagram",
    status: "Approved",
    scheduledFor: day(5, 18),
    color: "sage",
  },
  {
    id: "p3",
    image: sample3,
    caption:
      "Studio mornings. Every piece begins as a sketch on handmade paper — today we're draping the Monsoon '26 collection. The process is as beautiful as the product.\n\n#BehindTheScenes #AmyrahLuxe #FashionDesign #MadeInIndia",
    type: "Behind the Scenes",
    platform: "Instagram",
    status: "Draft",
    scheduledFor: day(7, 11),
    color: "cream",
  },
  {
    id: "p4",
    image: sample4,
    caption:
      "Monsoon palette decoded: pair deep teals with antique gold jewellery for evening events, or go ivory-on-ivory for that effortless brunch look. Which combination speaks to you?\n\n#ColourCoding #StylingTips #AmyrahLuxe #FashionAdvice #MonsoonFashion",
    type: "Styling Tips",
    platform: "Instagram",
    status: "Scheduled",
    scheduledFor: day(10, 13),
    color: "blush",
  },
  {
    id: "p5",
    image: sample5,
    caption:
      "The complete Festive Edit — 12 pieces, one vision. From flowing lehengas to structured blazer sets, every silhouette designed to move with you. Explore the full catalogue via the link in bio.\n\n#FestiveEdit #Catalogue #AmyrahLuxe #WomensFashion #LuxuryEthnic",
    type: "Catalogue",
    platform: "Instagram",
    status: "Draft",
    scheduledFor: day(13, 10),
    color: "rose",
  },
  {
    id: "p6",
    image: sample6,
    caption:
      "Meet the hands behind the embroidery. Our artisan Rekha has spent 22 years perfecting zardozi work — each motif takes 6 hours of focused craft. This is slow fashion, done right.\n\n#Artisan #BehindTheScenes #AmyrahLuxe #SlowFashion #Handmade #MadeInIndia",
    type: "Behind the Scenes",
    platform: "Instagram",
    status: "Approved",
    scheduledFor: day(17, 10),
    color: "charcoal",
  },
];

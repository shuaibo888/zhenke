import { requestApi, type ApiResponse, type TableResponse } from "./apiClient";
import { loadCurrentLocation } from "@/utils/currentLocation";
import { extractPlatformMediaPath } from "@/utils/mediaUrl";
export type Perspective = "LOCAL" | "TOURIST" | "HOMETOWNER";
export type EnjoyCategory = "MALL" | "RESTAURANT" | "SCENIC" | "HOTEL";
export interface Place {
  placeId: number;
  provider: string;
  providerPlaceId: string;
  placeName: string;
  placeType?: string;
  address: string;
  province?: string;
  city?: string;
  district?: string;
  provinceCode?: string;
  cityCode?: string;
  districtCode?: string;
  latitude: number;
  longitude: number;
  coordinateSystem: string;
}
export interface PostResource {
  resourceId?: number;
  resourceType: "IMAGE" | "VIDEO";
  resourceUrl: string;
  resourceSort?: number;
}
export interface PostPlaceSelection {
  provider: string;
  providerPlaceId: string;
  name: string;
  type?: string;
  address: string;
  province?: string;
  city?: string;
  district?: string;
  provinceCode?: string;
  cityCode?: string;
  districtCode?: string;
  latitude: number;
  longitude: number;
}
export interface PublishPostBody {
  title: string;
  content: string;
  suggestion?: string;
  perspective: Perspective;
  place: PostPlaceSelection;
  merchantId?: number;
  resources: PostResource[];
}
export interface ZhenkePost {
  postId: number;
  shopUserId: number;
  userName: string;
  nickName?: string;
  avatar?: string;
  title: string;
  content: string;
  suggestion?: string;
  perspective: Perspective;
  placeId: number;
  placeName: string;
  placeAddress: string;
  placeProvince?: string;
  placeCity?: string;
  placeDistrict?: string;
  placeLatitude: number;
  placeLongitude: number;
  merchantId?: number;
  merchantName?: string;
  publishedAt: string;
  status: string;
  commentCount: number;
  usefulCount: number;
  usefulByMe: boolean;
  featured?: boolean;
  resources: PostResource[];
}
export interface PostComment {
  commentId: number;
  postId: number;
  parentCommentId?: number;
  replyToCommentId?: number;
  shopUserId: number;
  userName: string;
  nickName?: string;
  avatar?: string;
  replyToName?: string;
  postAuthor: boolean;
  content: string;
  createTime: string;
  replyCount?: number;
  replies?: PostComment[];
}
export interface MerchantOption {
  merchantId: number;
  shopName: string;
}
export interface Banner {
  bannerId: number;
  title: string;
  subtitle?: string;
  imageUrl: string;
  jumpType: "INTERNAL" | "EXTERNAL";
  jumpTarget: string;
  bannerSort: number;
}
export interface ZhenkeEnjoy {
  enjoyId: number;
  category: EnjoyCategory;
  title: string;
  subtitle?: string;
  coverUrl: string;
  mediaUrls?: string[];
  serviceSummary: string;
  content: string;
  highlights?: string;
  openingHours?: string;
  contactPhone?: string;
  placeId?: number;
  placeName?: string;
  placeType?: string;
  placeAddress?: string;
  placeProvince?: string;
  placeCity?: string;
  placeDistrict?: string;
  placeLatitude?: number;
  placeLongitude?: number;
  displaySort: number;
  publishedAt?: string;
  likeCount: number;
  commentCount: number;
  mediaCount?: number;
  likedByMe: boolean;
}
export interface EnjoyComment {
  commentId: number;
  enjoyId: number;
  parentCommentId?: number;
  replyToCommentId?: number;
  shopUserId: number;
  userName: string;
  nickName?: string;
  avatar?: string;
  replyToName?: string;
  content: string;
  createTime: string;
  replyCount?: number;
  replies?: EnjoyComment[];
}

export interface ZhenkeHomeContent {
  posts: ZhenkePost[];
  featuredPosts?: ZhenkePost[];
  banners: Banner[];
  enjoys: Record<EnjoyCategory, ZhenkeEnjoy[]>;
  postError?: string | null;
  featuredPostError?: string | null;
  bannerError?: string | null;
  enjoyError?: string | null;
}

function appendCurrentCity(query: URLSearchParams) {
  const city = loadCurrentLocation()?.city?.trim();
  if (city) query.set("city", city);
}

export async function homeContent() {
  const query = new URLSearchParams();
  appendCurrentCity(query);
  const queryString = query.toString();
  const suffix = queryString ? `?${queryString}` : "";
  return (
    await requestApi<ApiResponse<ZhenkeHomeContent>>(
      `/shop/zhenke/home${suffix}`,
    )
  ).data!;
}

export async function posts(
  perspective: Perspective | "RECOMMEND" = "RECOMMEND",
  pageNum = 1,
  pageSize = 12,
  placeId?: number,
  postCity?: string,
) {
  const q = new URLSearchParams({
    perspective,
    pageNum: String(pageNum),
    pageSize: String(pageSize),
  });
  if (placeId) q.set("placeId", String(placeId));
  if (postCity?.trim()) q.set("postCity", postCity.trim());
  appendCurrentCity(q);
  const r = await requestApi<TableResponse<ZhenkePost>>(
    `/shop/zhenke/posts?${q}`,
  );
  return { rows: r.rows ?? [], total: r.total ?? 0 };
}

export async function postCities(
  perspective: Perspective | "RECOMMEND" = "RECOMMEND",
) {
  const q = new URLSearchParams({ perspective });
  appendCurrentCity(q);
  const result = await requestApi<ApiResponse<string[]>>(
    `/shop/zhenke/posts/cities?${q}`,
  );
  return Array.isArray(result.data)
    ? result.data.filter((city): city is string => typeof city === "string" && city.trim().length > 0)
    : [];
}
export async function post(id: number) {
  return (await requestApi<ApiResponse<ZhenkePost>>(`/shop/zhenke/posts/${id}`))
    .data!;
}
export async function mine(pageNum = 1) {
  const r = await requestApi<TableResponse<ZhenkePost>>(
    `/shop/zhenke/posts/me?pageNum=${pageNum}&pageSize=20`,
    {},
    true,
  );
  return { rows: r.rows ?? [], total: r.total ?? 0 };
}
export async function publish(body: PublishPostBody) {
  const resources = body.resources.map((resource) => {
    const resourceUrl = extractPlatformMediaPath(resource.resourceUrl);
    if (!resourceUrl) throw new Error("帖子媒体地址无效，请重新上传");
    return { ...resource, resourceUrl };
  });
  return (
    await requestApi<ApiResponse<ZhenkePost>>(
      "/shop/zhenke/posts",
      {
        method: "POST",
        body: JSON.stringify({ ...body, resources }),
      },
      true,
    )
  ).data!;
}
export async function removePost(id: number) {
  await requestApi(`/shop/zhenke/posts/${id}`, { method: "DELETE" }, true);
}
export async function toggleUseful(id: number) {
  const result = await requestApi<ApiResponse<{
    useful?: boolean;
    usefulByMe?: boolean;
    usefulCount: number;
  }>>(
    `/shop/zhenke/posts/${id}/useful`,
    { method: "POST" },
    true,
  );
  if (!result.data) throw new Error("“有用”状态更新失败");
  return {
    usefulCount: result.data.usefulCount,
    usefulByMe: result.data.usefulByMe ?? result.data.useful ?? false,
  };
}
export async function comments(id: number, pageNum = 1, pageSize = 10) {
  const result = await requestApi<TableResponse<PostComment>>(
    `/shop/zhenke/posts/${id}/comments?pageNum=${pageNum}&pageSize=${pageSize}`,
  );
  return { rows: result.rows ?? [], total: result.total ?? 0 };
}
export async function commentReplies(id: number, rootCommentId: number, pageNum = 1, pageSize = 10) {
  const result = await requestApi<TableResponse<PostComment>>(
    `/shop/zhenke/posts/${id}/comments/${rootCommentId}/replies?pageNum=${pageNum}&pageSize=${pageSize}`,
  );
  return { rows: result.rows ?? [], total: result.total ?? 0 };
}
export async function createComment(
  id: number,
  content: string,
  replyToCommentId?: number,
) {
  return (
    await requestApi<ApiResponse<PostComment>>(
      `/shop/zhenke/posts/${id}/comments`,
      { method: "POST", body: JSON.stringify({ content, replyToCommentId }) },
      true,
    )
  ).data!;
}
export async function deleteComment(id: number, cid: number) {
  await requestApi(
    `/shop/zhenke/posts/${id}/comments/${cid}`,
    {
      method: "DELETE",
    },
    true,
  );
}
export async function upload(file: File) {
  const f = new FormData();
  f.append("file", file);
  const result = await requestApi<ApiResponse<string>>(
    "/shop/zhenke/resources",
    {
      method: "POST",
      body: f,
    },
    true,
  );
  const path = extractPlatformMediaPath(result.data);
  if (!path) throw new Error("帖子媒体上传结果无效，请重试");
  return path;
}
export async function place(id: number) {
  return (await requestApi<ApiResponse<Place>>(`/shop/zhenke/places/${id}`))
    .data!;
}
export async function banners() {
  return (
    (await requestApi<ApiResponse<Banner[]>>("/shop/zhenke/banners")).data ?? []
  );
}

export async function merchantOptions(keyword = "") {
  const data = (
    await requestApi<ApiResponse<Array<MerchantOption | null>>>(
      `/shop/zhenke/merchant-options?keyword=${encodeURIComponent(keyword)}`,
    )
  ).data;
  if (!Array.isArray(data)) return [];
  return data.filter(
    (item): item is MerchantOption =>
      item != null
      && Number.isFinite(item.merchantId)
      && typeof item.shopName === "string"
      && item.shopName.trim().length > 0,
  );
}

export async function enjoys(category?: EnjoyCategory, pageNum = 1, pageSize = 12) {
  const query = new URLSearchParams({ pageNum: String(pageNum), pageSize: String(pageSize) });
  if (category) query.set("category", category);
  appendCurrentCity(query);
  const result = await requestApi<TableResponse<ZhenkeEnjoy>>(`/shop/zhenke/enjoys?${query}`);
  return { rows: result.rows ?? [], total: result.total ?? 0 };
}

export async function enjoyDetail(id: number) {
  return (await requestApi<ApiResponse<ZhenkeEnjoy>>(`/shop/zhenke/enjoys/${id}`)).data!;
}

export async function toggleEnjoyLike(id: number) {
  return (
    await requestApi<ApiResponse<{ liked: boolean; likeCount: number }>>(
      `/shop/zhenke/enjoys/${id}/like`,
      { method: "POST" },
      true,
    )
  ).data!;
}

export async function enjoyComments(id: number, pageNum = 1, pageSize = 10) {
  const result = await requestApi<TableResponse<EnjoyComment>>(
    `/shop/zhenke/enjoys/${id}/comments?pageNum=${pageNum}&pageSize=${pageSize}`,
  );
  return { rows: result.rows ?? [], total: result.total ?? 0 };
}

export async function enjoyCommentReplies(id: number, rootCommentId: number, pageNum = 1, pageSize = 10) {
  const result = await requestApi<TableResponse<EnjoyComment>>(
    `/shop/zhenke/enjoys/${id}/comments/${rootCommentId}/replies?pageNum=${pageNum}&pageSize=${pageSize}`,
  );
  return { rows: result.rows ?? [], total: result.total ?? 0 };
}

export async function createEnjoyComment(id: number, content: string, replyToCommentId?: number) {
  return (
    await requestApi<ApiResponse<EnjoyComment>>(
      `/shop/zhenke/enjoys/${id}/comments`,
      { method: "POST", body: JSON.stringify({ content, replyToCommentId }) },
      true,
    )
  ).data!;
}

export async function deleteEnjoyComment(id: number, commentId: number) {
  await requestApi(
    `/shop/zhenke/enjoys/${id}/comments/${commentId}`,
    { method: "DELETE" },
    true,
  );
}
